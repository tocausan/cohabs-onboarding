import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const { exec } = require('child_process');
import chalk from 'chalk';

// The following command works in the terminal
// mysql -h 127.0.0.1 -ucohabs -p"qe*aV9qapYW*cmj9" -P3307 cohabs_onboarding -e "SHOW DATABASES"

const DbServices = {
   // reset database
   resetDatabase: async function (): Promise<void> {
      return new Promise((resolve, reject) => {
         return exec(`mysql -h ${process.env.DB_HOST} -u${process.env.DB_USER} -p"${process.env.DB_PASSWORD}" -P ${process.env.DB_PORT} ${process.env.DB_NAME} -e "DROP DATABASE ${process.env.DB_NAME}; CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME};"`, (error: Error, stdout: any, stderr: any) => {
            if (error) reject(error);
            console.log(chalk.green('> Database "' + process.env.DB_NAME + '" reset'));
            resolve()
         });
      })
   },
   // restore database dump into mysql
   restoreDump: async function (filePath: string): Promise<void> {
      return new Promise((resolve, reject) => {
         return exec(`mysql -h ${process.env.DB_HOST} -u${process.env.DB_USER} -p"${process.env.DB_PASSWORD}" -P ${process.env.DB_PORT} ${process.env.DB_NAME} < ${filePath}`, (error: Error, stdout: any, stderr: any) => {
            if (error) reject(error);
            console.log(chalk.green('> Dump restored from ' + filePath));
            resolve()
         });
      });
   }
}

export default DbServices;