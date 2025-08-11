import { NextRequest } from "next/server";
import pdfMake from "pdfmake/build/pdfmake";
import { WorksheetRequest } from "../../../lib/types/worksheet";
import { imageToBase64, getRandomProblems } from "../../../lib/pdf/utils";
import { createWorksheetDocDefinition, createDemoDocDefinition } from "../../../lib/pdf/doc";

export async function POST(req: NextRequest) {
  try {
    const body: WorksheetRequest = await req.json();
    let { title, creator, images } = body;
    if (!images || images.length === 0) return new Response("No images provided", { status: 400 });

    const pdfFonts = await import("pdfmake/build/vfs_fonts");
    pdfMake.vfs = pdfFonts.default.vfs;

    const imagePromises = images.map(imageToBase64);
    const base64Images = await Promise.all(imagePromises);

    const docDefinition: any = createWorksheetDocDefinition(images, base64Images, title, creator);

    return new Promise<Response>((resolve, reject) => {
      try {
        pdfMake.createPdf(docDefinition).getBuffer((buffer) => {
          const res = new Response(buffer as any, {headers: {"Content-Type": "application/pdf", "Content-Disposition": "inline; filename=worksheet.pdf"}});
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

  const demoProblems = getRandomProblems(12);
  const imagePromises = demoProblems.map(imageToBase64);
  const base64Images = await Promise.all(imagePromises);

  const docDefinition: any = createDemoDocDefinition(demoProblems, base64Images);

  return new Promise<Response>((resolve, reject) => {
    try {
              pdfMake.createPdf(docDefinition).getBuffer((buffer) => {
          const res = new Response(buffer as any, {
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
