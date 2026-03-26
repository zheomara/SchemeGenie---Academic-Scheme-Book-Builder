
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import * as docx from "docx";
import JSZip from "jszip";
import { SchemeBook, Lesson, SchemeMetadata } from "../types";

const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, PageOrientation } = docx;

const sanitizeText = (text: any): string => {
  if (text === null || text === undefined) return "";
  return String(text).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFDD0-\uFDEF\uFFFE\uFFFF]/g, "");
};

const createCellContent = (text: string, size: number, isBold: boolean = false) => {
  const sanitized = sanitizeText(text);
  if (!sanitized) {
    return [new Paragraph({})];
  }
  const runs = sanitized.split(/\r?\n/).map((line, idx) => new TextRun({ text: line, size, bold: isBold, break: idx > 0 ? 1 : undefined }));
  return [new Paragraph({ children: runs })];
};

export const exportToPDF = (scheme: SchemeBook) => {
  const doc = new jsPDF({ orientation: "landscape", unit: 'mm', format: 'a4' });
  
  [1, 2, 3].forEach((termNum, index) => {
    const termLessons = scheme.lessons.filter(l => l.term === termNum);
    if (termLessons.length === 0) return;

    if (index > 0) doc.addPage();

    doc.setFontSize(14);
    doc.text(`${scheme.metadata.subject} - TERM ${termNum}`, 14, 15);
    doc.setFontSize(8);
    doc.text(`${scheme.metadata.school} | Form: ${scheme.metadata.form} | Year: ${scheme.metadata.academicYear}`, 14, 20);
    
    const body = termLessons.map(l => {
      return [
        "", // Blank week column
        l.lessonNumber,
        "", // Blank for teacher to fill
        l.topic, 
        l.objectives, 
        l.activities, 
        l.resources,
        l.assessment,
        l.evaluation,
        "" // Remarks column
      ];
    });

    autoTable(doc, {
      startY: 25,
      head: [['Week', 'Lesson', 'Date', 'Topic', 'Learning Objectives', 'Activities', 'Resources', 'Assessment', 'Evaluation Criteria', 'Remarks']],
      body: body,
      theme: 'grid',
      styles: { 
        fontSize: 6, 
        cellPadding: 0.8,
        valign: 'top',
        overflow: 'linebreak'
      },
      headStyles: { 
        fillColor: [51, 65, 85],
        textColor: 255,
        fontSize: 6.5,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 10 }, // Week
        1: { cellWidth: 10 }, // Lesson
        2: { cellWidth: 18 }, // Date
        3: { cellWidth: 30 }, // Topic
        4: { cellWidth: 40 }, // Objectives
        5: { cellWidth: 40 }, // Activities
        6: { cellWidth: 25 }, // Resources
        7: { cellWidth: 22 }, // Assessment
        8: { cellWidth: 30 }, // Eval Criteria
        9: { cellWidth: 50 }  // Remarks (Wider)
      },
      margin: { top: 25, right: 8, bottom: 8, left: 8 }
    });
  });
  
  doc.save(`${scheme.metadata.subject}_Scheme_${scheme.metadata.academicYear.replace('/', '-')}.pdf`);
};

export const exportToWord = async (scheme: SchemeBook) => {
  const children: any[] = [
    new Paragraph({ 
      text: `${scheme.metadata.subject} Full Year Scheme`, 
      heading: HeadingLevel.HEADING_1, 
      alignment: AlignmentType.CENTER 
    }),
    new Paragraph({ 
      text: `${scheme.metadata.school} - Form ${scheme.metadata.form} - Academic Year ${scheme.metadata.academicYear}`, 
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  ];

  [1, 2, 3].forEach(termNum => {
    const termLessons = scheme.lessons.filter(l => l.term === termNum);
    if (termLessons.length === 0) return;

    children.push(new Paragraph({ text: `TERM ${termNum}`, heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }));
    
    const columnWidths = [800, 800, 1200, 1800, 2200, 2200, 1600, 1400, 1600, 2400];

    const headerRow = new TableRow({ 
      children: ['Week', 'Lesson', 'Date', 'Topic', 'Learning Objectives', 'Activities', 'Resources', 'Assessment', 'Evaluation', 'Remarks'].map(h => 
        new TableCell({ 
          shading: { fill: "334155" },
          children: [new Paragraph({ 
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: h, color: "FFFFFF", size: 16, bold: true })] 
          })] 
        })
      ) 
    });

    const rows = termLessons.map(l => {
      return new TableRow({
        children: [
          new TableCell({ children: createCellContent("", 14) }), // Blank week column
          new TableCell({ children: createCellContent(l.lessonNumber?.toString() || "", 14) }),
          new TableCell({ children: createCellContent("", 14) }), // Blank for teacher to fill
          new TableCell({ children: createCellContent(l.topic, 14, true) }),
          new TableCell({ children: createCellContent(l.objectives, 14) }),
          new TableCell({ children: createCellContent(l.activities, 14) }),
          new TableCell({ children: createCellContent(l.resources, 14) }),
          new TableCell({ children: createCellContent(l.assessment, 14) }),
          new TableCell({ children: createCellContent(l.evaluation, 14) }),
          new TableCell({ children: createCellContent("", 14) })
        ]
      });
    });

    children.push(new Table({
      columnWidths: columnWidths,
      width: { size: 16000, type: WidthType.DXA },
      rows: [headerRow, ...rows],
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
        insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      }
    }));
  });

  const doc = new Document({ 
    sections: [{ 
      properties: { 
        page: { 
          size: {
            orientation: PageOrientation.LANDSCAPE,
          },
          margin: { top: 400, right: 400, bottom: 400, left: 400 }
        } 
      }, 
      children 
    }] 
  });
  
  const blob = await Packer.toBlob(doc);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  
  const safeSubject = sanitizeText(scheme.metadata.subject).replace(/[^a-zA-Z0-9 -]/g, "");
  const safeYear = sanitizeText(scheme.metadata.academicYear).replace(/[^a-zA-Z0-9 -]/g, "");
  link.download = `${safeSubject}_Scheme_${safeYear}.docx`;
  link.click();
};

export const exportToExcel = (scheme: SchemeBook) => {
  const data = scheme.lessons.map(l => ({
    "Term": l.term,
    "Week": "", // Blank week column
    "Lesson": l.lessonNumber,
    "Date": "", // Blank for teacher to fill
    "Topic": l.topic,
    "Learning Objectives": l.objectives,
    "Activities": l.activities,
    "Resources": l.resources,
    "Assessment": l.assessment,
    "Evaluation Criteria": l.evaluation,
    "Remarks": l.remarks
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Scheme");
  XLSX.writeFile(wb, `${scheme.metadata.subject}_Scheme.xlsx`);
};

export const downloadLessonResourcesZip = async (lesson: Lesson, metadata: SchemeMetadata) => {
  const zip = new JSZip();
  const folder = zip.folder(`Term${lesson.term}_Wk${lesson.week}_Lesson${lesson.lessonNumber}`);
  folder?.file("lesson_plan.txt", lesson.lessonPlanContent || "");
  folder?.file("worksheet.txt", lesson.worksheetContent || "");
  if (lesson.slidesContent) {
    folder?.file("slides.txt", lesson.slidesContent.join('\n\n'));
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Lesson_${lesson.lessonNumber}_Resources.zip`;
  link.click();
};

export const exportRecordBookExcel = (scheme: SchemeBook) => {
  const data = scheme.lessons.map(l => ({
    "Term": l.term,
    "Week": "", // Blank week column
    "Lesson": l.lessonNumber,
    "Topic": l.topic,
    "Student Name": "",
    "Mark /10": "",
    "Comments": ""
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Grades");
  XLSX.writeFile(wb, `${scheme.metadata.subject}_Record_Book.xlsx`);
};

export const downloadFullPackageZip = async (scheme: SchemeBook) => {
  const zip = new JSZip();
  const meta = zip.folder("metadata");
  meta?.file("info.txt", `Subject: ${scheme.metadata.subject}\nForm: ${scheme.metadata.form}\nSchool: ${scheme.metadata.school}`);
  
  // We can't easily embed the PDF/Word directly without re-generating inside the zip logic,
  // so we usually just zip the data or a note. For a "Full Package", we'll zip an Excel version and a Readme.
  const excelBuffer = XLSX.write(XLSX.utils.book_new(), { bookType: 'xlsx', type: 'array' });
  zip.file("Scheme_Data.xlsx", excelBuffer);
  zip.file("README.txt", "This package contains your academic scheme. Use the web app to export PDF and DOCX formats.");
  
  const blob = await zip.generateAsync({ type: "blob" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${scheme.metadata.subject}_Package.zip`;
  link.click();
};
