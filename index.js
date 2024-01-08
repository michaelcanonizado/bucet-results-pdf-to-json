import fs from "fs";
import { PdfReader } from "pdfreader";

let data = [];

async function getFilesAndDirectories(dir) {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, (err, folders) => {
      if (err) return err;

      resolve(folders);
    });
  });
}

function convertPdfToJson(dirInput) {
  let pageData = {};

  return new Promise(function (resolve, reject) {
    // #1.1.1 - Scan the PDF
    new PdfReader().parseFileItems(dirInput, (err, item) => {
      if (err) {
        console.log(err);
        reject(err);
      } else if (!item) {
        reject(err);
      } else if (item.page) {
        // #1.1.3 - After each new page, push the page Object into the Array to organize the scanned PDF.
        pageData = {};
        data.push(pageData);
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

async function formatStudentData(data, YEAR, CAMPUS_ABV, COURSE_NUMBER) {
  const studentsFormattedData = [];

  for (const page of data) {
    for (const row in page) {
      const rowData = page[row].map((item) => item.trim());

      // Retrieve the status of the student.
      const statuses = ["QUALIFIED", "WAITLISTED"];
      let status = statuses.includes(rowData[0].toUpperCase())
        ? rowData[0].toUpperCase()
        : null;

      // Determine a student when the first item of the Array is a number or float.
      if (!isNaN(parseFloat(rowData[0])) && rowData.length >= 8) {
        const studentData = {
          rank: rowData[0],
          lastName: rowData[1] || "",
          firstName: rowData[2],
          middleName: rowData.length === 9 ? rowData[3] : " ",
          city: rowData.length === 9 ? rowData[4] : rowData[3],
          province: rowData.length === 9 ? rowData[5] : rowData[4],
          school: rowData.length === 9 ? rowData[6] : rowData[5],
          compositeRating: rowData.length === 9 ? rowData[7] : rowData[6],
          percentileRank: rowData.length === 9 ? rowData[8] : rowData[7],
          status: status,
          course: COURSE_NUMBER,
          campus: CAMPUS_ABV,
          year: YEAR,
        };

        studentsFormattedData.push(studentData);
      }
    }
  }

  return studentsFormattedData;
}

export async function convertAndFormatData(
  dirInput,
  YEAR,
  CAMPUS_ABV,
  COURSE_NUMBER
) {
  // #1.1 - Locate and scan the PDF using the collected Campus Abbreviation and Course Code.
  await convertPdfToJson(
    `${dirInput}/${YEAR}/${CAMPUS_ABV}/${COURSE_NUMBER}`,
    CAMPUS_ABV,
    COURSE_NUMBER
  );

  // #1.2 - The data outputted by npm pdfreader is jumbled. Hence, the Object keys need to be arranged chronologically as their keys are the Y-Values of the scanned rows of the PDF.
  const sortedData = sortObjectKeys(data);

  // #1.3 - Format the data into an Array of Objects. Where each student is an Object and the keys represent the PDF table labels.
  const studentsFormattedData = await formatStudentData(
    sortedData,
    YEAR,
    CAMPUS_ABV,
    COURSE_NUMBER
  );

  // #1.5 Flush the scanned and formatted students data for the next course, since the data is globally initialized
  data = [];

  // Return the formatted data
  return studentsFormattedData;
}

async function parsePdfFiles(dirInput, dirOutput = "./output.json") {
  let mergedData = [];

  // #1 - Loop through input directory to scan and convert all PDFs
  const years = await getFilesAndDirectories(dirInput);

  for (const year of years) {
    const campuses = await getFilesAndDirectories(`${dirInput}/${year}`);

    for (const campus of campuses) {
      const courseCodes = await getFilesAndDirectories(
        `${dirInput}/${year}/${campus}`
      );

      for (const courseCode of courseCodes) {
        const formattedData = await convertAndFormatData(
          dirInput,
          year,
          campus,
          courseCode
        );
        mergedData.push(...formattedData);
      }
    }
  }

  // #2 - Write the merged data into a JSON file.
  await fs.writeFile(dirOutput, JSON.stringify(mergedData), (err) => {
    if (err) {
      return err;
    }
  });
}

parsePdfFiles("./pdfs");
