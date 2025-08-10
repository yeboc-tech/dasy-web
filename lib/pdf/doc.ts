import { WorksheetRequest } from "../types/worksheet";
import { createTwoColumnLayout, createFooter } from "./utils";

export function createWorksheetDocDefinition(
  images: string[], 
  base64Images: string[], 
  title?: string, 
  creator?: string
) {
  return {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 30],
    footer: createFooter,
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
}

export function createDemoDocDefinition(images: string[], base64Images: string[]) {
  return {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    footer: createFooter,
    content: [
      // {
      //   text: "Sample Worksheet",
      //   fontSize: 24,
      //   bold: true,
      //   alignment: 'center',
      //   margin: [0, 0, 0, 20]
      // },
      // {
      //   text: "Created by: Demo Teacher",
      //   fontSize: 12,
      //   alignment: 'center',
      //   color: '#666666',
      //   margin: [0, 0, 0, 30]
      // },
      ...createTwoColumnLayout(images, base64Images)
    ],
  };
}
