import fs from "fs";
import path from "path";
import { PdfReader } from "pdfreader";

// Asynchronously read directory contents recursively
async function readDirectoryRecursively(dir) {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map((dirent) => {
      const res = path.resolve(dir, dirent.name);
      return dirent.isDirectory() ? readDirectoryRecursively(res) : res;
    })
  );
  return Array.prototype.concat(...files);
}

// Converts a string to title case.
function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

// Process PDF file and return data in a structured format.
async function processPdf(path) {
  let pages = [];
  let currentPage = {};

  return new Promise((resolve, reject) => {
    new PdfReader().parseFileItems(path, (err, item) => {
      if (err) {
        reject(err);
      } else if (!item) {
        resolve(pages);
      } else if (item.page) {
        currentPage = {};
        pages.push(currentPage);
      } else if (item.text) {
        (currentPage[item.y] = currentPage[item.y] || []).push(item.text);
      }
    });
  });
}

// Format PDF data.
function formatPdfData(data, year, campus, course) {
  let formattedData = [];

  data.forEach((page) => {
    const statusRow = Object.values(page).find(
      (row) =>
        row.length === 1 &&
        ["Qualified", "Waitlisted"].includes(toTitleCase(row[0]))
    );
    const status = statusRow ? toTitleCase(statusRow[0]) : null;

    Object.entries(page).forEach(([_, data]) => {
      // Skip if first column is not a number or if there are fewer columns.
      if (isNaN(parseFloat(data[0])) || data.length < 8) return;

      // If there are 9 columns, then there is a middle name and
      // the rest of the data is offset by 1.
      const offset = data.length === 9 ? 1 : 0;

      data = data.map((item) => item.trim());
      formattedData.push({
        rank: data[0],
        lastName: toTitleCase(data[1]),
        firstName: toTitleCase(data[2]),
        middleName: offset ? toTitleCase(data[3]) : null,
        city: toTitleCase(data[3 + offset]),
        province: toTitleCase(data[4 + offset]),
        school: toTitleCase(data[5 + offset]),
        compositeRating: data[6 + offset],
        percentileRank: data[7 + offset],
        status: status,
        course: course,
        campus: campus,
        year: year,
      });
    });
  });

  return formattedData;
}

// Main function to parse PDF files and output JSON
async function parsePdfFiles(inpath, outpath = "./output.json") {
  const pathPattern = /[\\/](\d{4})[\\/]([^\\/]+)[\\/]([^\\/]+)\.pdf$/;
  let allData = [];

  try {
    const files = await readDirectoryRecursively(inpath);
    for (const file of files) {
      const match = file.match(pathPattern);
      if (match) {
        const [, year, campus, course] = match;
        const pdfData = await processPdf(file);
        const formattedData = formatPdfData(pdfData, year, campus, course);
        allData.push(formattedData);
      }
    }

    fs.writeFileSync(outpath, JSON.stringify(allData));
  } catch (err) {
    console.error("Error processing PDF files:", err);
  }
}

// Start processing.
parsePdfFiles("./pdfs");
