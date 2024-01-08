import fs from "fs";

import { consoleLog } from "./consoleLog.js";

const BUCET_RESULTS_2023_2024 = {
  "university-name": "Bicol University",
  "school-year": "2023-2024",
  data: [],
};

async function getFilesAndDirectories(dir) {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, (err, folders) => {
      if (err) return err;

      resolve(folders);
    });
  });
}

async function joinJsonData(dir) {
  await fs.readFile(dir, "utf8", (err, data) => {
    if (err) return err;

    BUCET_RESULTS_2023_2024.data.push(...JSON.parse(data));
  });
}

function countObjectsWithPropertyValue(arr, property, value) {
  let count = 0;

  for (let i = 0; i < arr.length; i++) {
    if (arr[i][property] === value) {
      count++;
    }
  }

  return count;
}

export async function joinFormattedData(dirInput, dirOutput) {
  consoleLog("\n", "\n");
  consoleLog(`joining all converted JSON data into one JSON Object`);

  // #2.1 - Loop through 'data-json' and spread each Course Array of students into 'BUCET_RESULTS_2023_2024.data'.
  const campuses = await getFilesAndDirectories(dirInput);
  for (const campus of campuses) {
    const courseCodes = await getFilesAndDirectories(`${dirInput}/${campus}`);

    for (const courseCode of courseCodes) {
      const dir = `${dirInput}/${campus}/${courseCode}`;
      await joinJsonData(dir);
    }
  }

  // #2.2 - Write BUCET_RESULTS_2023_2024.json in the top most level of the main directory.
  await fs.writeFile(
    `${dirOutput}.json`,
    JSON.stringify(BUCET_RESULTS_2023_2024),
    (err) => {
      if (err) {
        return err;
      }
    }
  );
  consoleLog(
    `done joining converted JSON data into one JSON Object: ${dirOutput}`
  );

  // #2.3 - Propmt user in the CLI of the total students, qualifiers, and waitlisters.
  consoleLog("\n", "\n");
  consoleLog(`total students: ${BUCET_RESULTS_2023_2024.data.length}`);
  consoleLog(
    `total qualified: ${countObjectsWithPropertyValue(
      BUCET_RESULTS_2023_2024.data,
      "status",
      "QUALIFIED"
    )}`
  );
  consoleLog(
    `total waitlisted: ${countObjectsWithPropertyValue(
      BUCET_RESULTS_2023_2024.data,
      "status",
      "WAITLISTED"
    )}`
  );
}
