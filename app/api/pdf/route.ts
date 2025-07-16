import { NextRequest } from "next/server";
import pdfMake from "pdfmake/build/pdfmake";
import fs from 'fs';
import path from 'path';
import problemDb from '../../../public/problems/db-index';

interface WorksheetRequest {
  title: string;
  creator: string;
  images: string[];
}

async function imageToBase64(imagePath: string): Promise<string> {
  try {
    const fullPath = path.join(process.cwd(), 'public', 'problems', imagePath);
    const imageBuffer = fs.readFileSync(fullPath);
    const base64 = imageBuffer.toString('base64');
    const extension = path.extname(imagePath).substring(1); // Remove the dot
    return `data:image/${extension};base64,${base64}`;
  } catch (error) {
    console.error(`Error loading image ${imagePath}:`, error);
    throw new Error(`Failed to load image: ${imagePath}`);
  }
}

function getRandomProblems(count: number = 20): string[] {
  const allProblems: string[] = [];
  
  // Collect all problems from different chapters
  Object.keys(problemDb).forEach(chapter => {
    const chapterProblems = problemDb[chapter as keyof typeof problemDb];
    chapterProblems.forEach((problem: string) => {
      allProblems.push(`${chapter}/${problem}`);
    });
  });
  
  // Shuffle and return random problems
  const shuffled = allProblems.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Function to create two-column layout for problems
function createTwoColumnLayout(problems: string[], base64Images: string[]) {
  const columns: any[] = [];
  
  for (let i = 0; i < problems.length; i += 2) {
    const leftProblem = base64Images[i];
    const rightProblem = base64Images[i + 1];
    
    const columnContent: any[] = [];
    
    // Left column
    if (leftProblem) {
      columnContent.push({
        image: leftProblem,
        width: 240,
        alignment: 'center',
        margin: [0, 0, 0, 20]
      });
    }
    
    // Right column
    if (rightProblem) {
      columnContent.push({
        image: rightProblem,
        width: 240,
        alignment: 'center',
        margin: [0, 0, 0, 20]
      });
    }
    
    columns.push({
      columns: columnContent,
      columnGap: 15,
      margin: [0, 0, 0, 30]
    });
  }
  
  return columns;
}

export async function POST(req: NextRequest) {
  try {
    const body: WorksheetRequest = await req.json();
    let { title, creator, images } = body;
    // Do NOT overwrite images here! Use the images sent from the frontend.

    if (!images || images.length === 0) {
      return new Response("No images provided", { status: 400 });
    }

    const pdfFonts = await import("pdfmake/build/vfs_fonts");
    pdfMake.vfs = pdfFonts.default.vfs;

    const imagePromises = images.map(imageToBase64);
    const base64Images = await Promise.all(imagePromises);

    const docDefinition: any = {
      pageSize: "A4",
      pageMargins: [40, 60, 40, 30],
      footer: function(currentPage: number, pageCount: number) {
        return [
          {
            canvas: [
              {
                type: 'line',
                x1: 0, y1: 0, x2: 595, y2: 0,
                lineWidth: 1,
                lineColor: '#e0e0e0'
              }
            ],
            margin: [0, 0, 0, 0]
          },
          {
            text: `${currentPage}`,
            alignment: 'center',
            fontSize: 10,
            color: '#666666',
            margin: [0, 8, 0, 0]
          }
        ];
      },
      content: [
        // {
        //   text: title || "Worksheet",
        //   fontSize: 24,
        //   bold: true,
        //   alignment: 'center',
        //   margin: [0, 0, 0, 20]
        // },
        // {
        //   text: `Created by: ${creator || "Teacher"}`,
        //   fontSize: 12,
        //   alignment: 'center',
        //   color: '#666666',
        //   margin: [0, 0, 0, 30]
        // },
        ...createTwoColumnLayout(images, base64Images)
      ],
    };

    return new Promise<Response>((resolve, reject) => {
      try {
        pdfMake.createPdf(docDefinition).getBuffer((buffer) => {
          const res = new Response(buffer, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": "inline; filename=worksheet.pdf",
            },
          });
          resolve(res);
        });
      } catch (error) {
        console.error("PDF generation error:", error);
        reject(new Response("PDF generation failed", { status: 500 }));
      }
    });

  } catch (error) {
    console.error("Request parsing error:", error);
    return new Response("Invalid request body", { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const pdfFonts = await import("pdfmake/build/vfs_fonts");
  pdfMake.vfs = pdfFonts.default.vfs;

  // Get random problems for demo
  const demoProblems = getRandomProblems(12);
  const imagePromises = demoProblems.map(imageToBase64);
  const base64Images = await Promise.all(imagePromises);

  const docDefinition: any = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    footer: function(currentPage: number, pageCount: number) {
      return [
        {
          canvas: [
            {
              type: 'line',
              x1: 0, y1: 0, x2: 595, y2: 0,
              lineWidth: 1,
              lineColor: '#e0e0e0'
            }
          ],
          margin: [0, 0, 0, 0]
        },
        {
          text: `${currentPage}`,
          alignment: 'center',
          fontSize: 10,
          color: '#666666',
          margin: [0, 10, 0, 0]
        }
      ];
    },
    content: [
      // Header
      {
        text: "Sample Worksheet",
        fontSize: 24,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 20]
      },
      {
        text: "Created by: Demo Teacher",
        fontSize: 12,
        alignment: 'center',
        color: '#666666',
        margin: [0, 0, 0, 30]
      },
      // Two-column layout for problems
      ...createTwoColumnLayout(demoProblems, base64Images)
    ],
  };

  return new Promise<Response>((resolve, reject) => {
    try {
      pdfMake.createPdf(docDefinition).getBuffer((buffer) => {
        const res = new Response(buffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": "inline; filename=worksheet.pdf",
          },
        });
        resolve(res);
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      reject(new Response("PDF generation failed", { status: 500 }));
    }
  });
}
