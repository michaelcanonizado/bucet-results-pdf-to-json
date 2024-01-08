const startTime = performance.now();

import { joinFormattedData } from "./utils/joinJsonData.js";
import { convertAndFormatData } from "./utils/pdfToJson.js";

import fs from "fs";
import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";
const rl = readline.createInterface({ input, output });

import { consoleLog } from "./utils/consoleLog.js";

async function getFilesAndDirectories(dir) {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, (err, folders) => {
      if (err) return err;

      resolve(folders);
    });
  });
}

async function scanAndFormatAllBucetResults(dirInput, dirOutput) {
  consoleLog("READING");

  // #1 - Loop through 'data-pdf' directory to collect all Campus Abbreviations (e.g. /BUCS) and Course Code (e.g. /A-53) and scan, convert it to JSON, and format it one by one. Output the JSON in a folder "data-json" with the same file structure.
  const campuses = await getFilesAndDirectories(dirInput);

  for (const campus of campuses) {
    const courseCodes = await getFilesAndDirectories(`${dirInput}/${campus}`);

    for (const courseCode of courseCodes) {
      await convertAndFormatData(dirInput, dirOutput, campus, courseCode);
    }
  }

  // #2 - Loop through the output directory (data-json) and its sub-folders (e.g. /BUCS), and reformat, and  concatinate it all together in one JSON Object
  await joinFormattedData(dirOutput, "./BUCET_RESULTS_2023_2024");

  // COnsole log the elapsed time to monitor performance
  const endTime = performance.now();
  consoleLog("\n", "\n");
  consoleLog(`Elapsed Time: ${(endTime - startTime).toFixed(3)}ms`);
  consoleLog(`Elapsed Time: ${((endTime - startTime) / 1000).toFixed(3)}s`);
  consoleLog("\n", "\n");

  // Ensure CLI tool is terminated
  rl.close();
}

scanAndFormatAllBucetResults("./data-pdf", "./data-json");
