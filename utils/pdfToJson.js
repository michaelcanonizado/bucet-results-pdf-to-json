import fs from "fs";
import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";
import { PdfReader } from "pdfreader";
import { ulid } from "ulid";

import { consoleLog } from "./consoleLog.js";

const rl = readline.createInterface({ input, output });

let data = [];

function convertPdfToJson(dirInput, CAMPUS_ABV, COURSE_NUMBER) {
  let pageData = {};

  consoleLog("\n", "\n");
  consoleLog(`scanning ${CAMPUS_ABV}: ${COURSE_NUMBER}`);
  consoleLog("");

  return new Promise(function (resolve, reject) {
    // #1.1.1 - Scan the PDF
    new PdfReader().parseFileItems(dirInput, (err, item) => {
      if (err) {
        console.log(err);
        reject(err);
      } else if (!item) {
        consoleLog("end of file");
        consoleLog(`done converting ${CAMPUS_ABV}: ${COURSE_NUMBER} to JSON`);
        consoleLog("");

        reject(err);
      } else if (item.page) {
        // #1.1.3 - After each new page, push the page Object into the Array to organize the scanned PDF.
        pageData = {};
        data.push(pageData);

        consoleLog(
          `done converting ${CAMPUS_ABV}: ${COURSE_NUMBER}, page ${item.page} to JSON`
        );

        resolve();
      } else if (item.text) {
        // #1.1.2 - Store each scanned row into an Object where the keys are the Y-Value coordinates of the row.
        (pageData[item.y] = pageData[item.y] || []).push(item.text);

        resolve();
      }
    });
  });
}

function sortObjectKeys(data) {
  return data.map((dataPage) => {
    const sortedObj = Object.keys(dataPage)
      // #1.2.1 - Returns an array of sorted keys
      .sort((a, b) => {
        return parseFloat(a) - parseFloat(b);
      })
      // 1.2.2 - Uses the array of sorted keys to sort the Object by creating another Object as the accumulator. Using each item on the sorted keys Array as the 'key' for the Object, and also using each item on the sorted keys Array to set the value for each 'key' on the Object by matching the value to the dataPage Object.
      .reduce((obj, key) => {
        obj[key] = dataPage[key];
        return obj;
      }, {});

    return sortedObj;
  });
}

async function formatStudentData(data, CAMPUS_ABV, COURSE_NUMBER) {
  const studentsFormattedData = [];

  // #1.3.1 - Course and Campus are declared here, not in the for of loop to prevent initializing on every new page. Since the whole document has the same Campus and Course
  let studentCourse = null;
  let studentCampus = null;

  for (const page of data) {
    let studentStatus = null;

    // #1.3.2 - Search whole doc for Course, Campus, and student status (Qualified or Waitlisted).
    for (const row in page) {
      // #1.3.3 - Assign Campus and Course only once for the whole document.
      if (studentCampus === null) {
        const str = page[row][0].toUpperCase().trim();

        if (
          str.includes("COLLEGE") ||
          str.includes("INSTITUTE") ||
          str.includes("BU ")
        ) {
          studentCampus = page[row][0];
          consoleLog("retrived campus from converted JSON");
        }
      }
      if (studentCourse === null) {
        const str = page[row][0].toUpperCase().trim();

        if (
          str.includes("BACHELOR") ||
          str.includes("BTVTED") ||
          str.includes("BSBA") ||
          str.includes("DOCTOR")
        ) {
          studentCourse = page[row][0];
          consoleLog("retrived course from converted JSON");
        }
      }

      // #1.3.4 - Assign student status (Qualified or Waitlisted) on every new page only.
      if (studentStatus === null) {
        if (page[row][0].toUpperCase().trim() === "QUALIFIED") {
          studentStatus = "QUALIFIED";
        }
        if (page[row][0].toUpperCase().trim() === "WAITLISTED") {
          studentStatus = "WAITLISTED";
        }
      }
    }

    // #1.3.5 - If for some reason no Course or Campus are found, prompt user in CLI to manually set one.
    if (studentCourse === null || undefined) {
      studentCourse = await rl.question(
        `Course not found for: ${CAMPUS_ABV} - ${COURSE_NUMBER} | Please Manually Enter: `
      );
      consoleLog("retrived course from converted JSON");
    }
    if (studentCampus === null || undefined) {
      studentCourse = await rl.question(
        `Campus not found for: ${CAMPUS_ABV} - ${COURSE_NUMBER} | Please Manually Enter: `
      );
      consoleLog("retrived campus from converted JSON");
    }

    // #1.3.6 - Format all retrived data into one Student Object.
    for (const row in page) {
      // #1.3.6.1 = Determine a student when the first item of the Array is a number or float.
      if (!isNaN(parseFloat(page[row][0]))) {
        // #1.3.6.2 - Immediately disregard rows with less than 9 items.
        if (page[row].length >= 8) {
          // #1.3.6.3 - Students with complete values
          if (page[row].length === 9) {
            studentsFormattedData.push({
              rank: page[row][0].trim(),
              lastName: page[row][1].trim(),
              firstName: page[row][2].trim(),
              middleName: page[row][3].trim(),
              city: page[row][4].trim(),
              province: page[row][5].trim(),
              school: page[row][6].trim(),
              compositeRating: page[row][7].trim(),
              percentileRank: page[row][8].trim(),
              status: studentStatus.toUpperCase().trim(),
              course: studentCourse,
              campus: [studentCampus, CAMPUS_ABV],
              id: ulid(),
            });
          } // #1.3.6.4 - Students with missing one value (no middle name).
          else {
            studentsFormattedData.push({
              rank: page[row][0].trim(),
              lastName: page[row][1].trim() || "",
              firstName: page[row][2].trim(),
              middleName: " ",
              city: page[row][3].trim(),
              province: page[row][4].trim(),
              school: page[row][5].trim(),
              compositeRating: page[row][6].trim(),
              percentileRank: page[row][7].trim(),
              status: studentStatus.toUpperCase().trim(),
              course: studentCourse.trim(),
              campus: [studentCampus.trim(), CAMPUS_ABV.trim()],
              id: ulid(),
            });
          }
        }
      }
    }
  }

  consoleLog("");
  consoleLog("done formating converted JSON");
  consoleLog("");

  return studentsFormattedData;
}

async function writeData(dir, course, data) {
  consoleLog(`writing files to: ${dir}`);

  // #1.4.1 - Check whether the neccessary folders needed to maintain the folder structure of 'data-pdf' is present.
  if (!fs.existsSync(dir)) {
    consoleLog(`${dir} not found`);
    consoleLog(`creating /${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }

  // #1.4.2 - Once folder is present, write the file.json.
  await fs.writeFile(
    `${dir}/${course.replace(".pdf", ".json")}`,
    JSON.stringify(data),
    (err) => {
      if (err) {
        return err;
      }
    }
  );

  return consoleLog(
    `done writing data to: ${dir}/${course.replace(".pdf", ".json")}`
  );
}

export async function convertAndFormatData(
  dirInput,
  dirOutput,
  CAMPUS_ABV,
  COURSE_NUMBER
) {
  // #1.1 - Locate and scan the PDF using the collected Campus Abbreviation and Course Code.
  await convertPdfToJson(
    `${dirInput}/${CAMPUS_ABV}/${COURSE_NUMBER}`,
    CAMPUS_ABV,
    COURSE_NUMBER
  );

  // #1.2 - The data outputted by npm pdfreader is jumbled. Hence, the Object keys need to be arranged chronologically as their keys are the Y-Values of the scanned rows of the PDF.
  const sortedData = sortObjectKeys(data);

  // #1.3 - Format the data into an Array of Objects. Where each student is an Object and the keys represent the PDF table labels.
  const studentsFormattedData = await formatStudentData(
    sortedData,
    CAMPUS_ABV,
    COURSE_NUMBER
  );

  // #1.4 Finally write the scanned and formatted data into 'data-json/<COURSE_ABV/COURSE_NUMBER>'
  await writeData(
    `${dirOutput}/${CAMPUS_ABV}`,
    COURSE_NUMBER,
    studentsFormattedData
  );

  // #1.5 Flush the scanned and formatted students data for the next course, since the data is globally initialized
  data = [];

  consoleLog(
    `number of students for ${CAMPUS_ABV}: ${COURSE_NUMBER.replace(
      ".pdf",
      ".json"
    )}: ${studentsFormattedData.length}`
  );
}
