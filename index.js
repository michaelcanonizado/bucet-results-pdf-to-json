import fs from "fs";
import path from "path";
import { PdfReader } from "pdfreader";

// Asynchronously read directory contents recursively
async function readDirectoryRecursively(directory) {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const resolvedPath = path.resolve(directory, entry.name);
      return entry.isDirectory()
        ? readDirectoryRecursively(resolvedPath)
        : resolvedPath;
    })
  );
  return files.flat();
}

// Process PDF file and return OCR data
async function processPdf(path) {
  const pages = [];
  let currentPage = {};

  return new Promise((resolve, reject) => {
    new PdfReader().parseFileItems(path, (err, item) => {
      if (err) {
        reject(err);
      } else if (!item) {
        resolve(pages);
      } else {
        if (item.page) {
          currentPage = {};
          pages.push(currentPage);
        } else if (item.text) {
          currentPage[item.y] = (currentPage[item.y] || []).concat(item.text);
        }
      }
    });
  });
}

// Format PDF data
function formatPdfData(data, year, campus, course) {
  const toTitleCase = (str) =>
    str
      .toLowerCase()
      .replace(/(?:^|\s|["'([{])+\S/g, (match) => match.toUpperCase());

  return data.flatMap((page) => {
    const status = Object.values(page).find((row) =>
      ["QUALIFIED", "WAITLISTED"].includes(row[0])
    )?.[0];
    return Object.values(page).flatMap((row) => {
      if (isNaN(parseFloat(row[0])) || row.length < 8) return [];
      row = row.map((str) => str.trim());
      const offset = row.length === 9 ? 1 : 0;
      return [
        {
          rank: row[0],
          lastName: toTitleCase(row[1]),
          firstName: toTitleCase(row[2]),
          middleName: offset ? toTitleCase(row[3]) : null,
          city: toTitleCase(row[3 + offset]),
          province: toTitleCase(row[4 + offset]),
          school: toTitleCase(row[5 + offset]),
          compositeRating: row[6 + offset],
          percentileRank: row[7 + offset],
          status: toTitleCase(status),
          course,
          campus,
          year,
        },
      ];
    });
  });
}

// Parse PDF files in a directory and write to output file
async function parsePdfFiles(inpath, outpath) {
  const pathPattern = /[\\/](\d{4})[\\/]([^\\/]+)[\\/]([^\\/]+)\.pdf$/;
  const files = await readDirectoryRecursively(inpath);
  const allData = await Promise.all(
    files.map(async (file) => {
      const match = file.match(pathPattern);
      if (match) {
        const [year, campus, course] = match.slice(1);
        const pdfData = await processPdf(file);
        return formatPdfData(pdfData, year, campus, course);
      }
    })
  );

  await fs.writeFileSync(outpath, JSON.stringify(allData.flat()));
}

// Start processing
parsePdfFiles("./pdfs", "./output.json");
