/*

Manual script or cron job to check Stripe disputes and fix them ?
Go for the Menu !

A) Dispute payment ticket
The dispute is due to the bank considering the payment as a fraud.
The dispute charge process is the following:
 - Create a payment in Stripe
 - Find the payment in the database
 - Duplicate the disputed payment in the database and update the values

*/

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import Stripe from 'stripe';
import { createConnection, Connection } from 'mysql';
import chalk from 'chalk';
import * as readline from 'node:readline';

import DbServices from './dbServices';
import processServices from './processServices';

async function initDb(): Promise<Connection> {
  return createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
}

async function initStripe(): Promise<Stripe> {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2022-11-15' });
}

(async () => {
  const stripe = await initStripe();
  const connection = await initDb();

  console.clear()

  function menu() {
    console.log(chalk.cyan('\n\n————————————————————————'));
    console.log(chalk.bold('Please choose an option:'));
    console.log(chalk.cyan('————————————————————————\n'));
    console.log(chalk.cyan('1 > Restore database from dump\t\t', chalk.bold('cohabs_onboarding.dump')));
    console.log(chalk.cyan('2 > Restore database from dump\t\t', chalk.bold('cohabs_support_challenge.dump')));
    console.log(chalk.cyan('3 > Tech. challenge: Synch DB to Stripe\t', chalk.yellow('requires', chalk.bold('cohabs_onboarding'), 'data')));
    console.log(chalk.cyan('4 > Supp. challenge: Process disputes\t', chalk.yellow('requires', chalk.bold('cohabs_support_challenge'), 'data')));
    console.log(chalk.cyan('5 > Supp. challenge: Fix rents\t\t'));
    console.log(chalk.cyan('6 > Exit'));

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(chalk.cyan('\n> '), async (choice) => {
      switch (choice) {
        case '1':
          // DATABASE RESET
          await DbServices.resetDatabase().catch(e => { console.log(e); process.exit(0) });
          // DATABASE RESTORATION
          await DbServices.restoreDump('./assets/cohabs_onboarding.dump').catch(e => { console.log(e); process.exit(0) });
          return menu()

        case '2':
          // DATABASE RESET
          await DbServices.resetDatabase().catch(e => { console.log(e); process.exit(0) });
          // DATABASE RESTORATION
          await DbServices.restoreDump('./assets/cohabs_support_challenge.dump').catch(e => { console.log(e); process.exit(0) });
          return menu()

        case '3':
          // SYNCH USERS > CUSTOMERS
          const customers = await processServices.synchStripeCustomers(stripe, connection).catch(e => { console.log(e); process.exit(0) });
          // SYNCH ROOMS > PRODUCTS
          const products = await processServices.synchStripeProducts(stripe, connection).catch(e => { console.log(e); process.exit(0) });
          // SYNCH LEASE > SUBSCRIPTIONS
          const subscriptions = await processServices.synchStripeSubscriptions(stripe, connection).catch(e => { console.log(e); process.exit(0) });

          console.log(chalk.bgCyan('\n Results '));
          console.log(chalk.cyan('\nCustomers:'));
          console.log(chalk.cyan(' Exist:'), customers.alreadyExistsCount);
          console.log(chalk.cyan(' Created:'), customers.hasBeenCreatedCount);
          console.log(chalk.red(' Error:'), customers.errorCount);
          console.log(chalk.cyan('\nProducts:'));
          console.log(chalk.cyan(' Exist:'), products.alreadyExistsCount);
          console.log(chalk.cyan(' Created:'), products.hasBeenCreatedCount);
          console.log(chalk.red(' Error:'), products.errorCount);
          console.log(chalk.cyan('\nSubscriptions:'));
          console.log(chalk.cyan(' Exist:'), subscriptions.alreadyExistsCount);
          console.log(chalk.cyan(' Created:'), subscriptions.hasBeenCreatedCount);
          console.log(chalk.red(' Error:'), subscriptions.errorCount);

          return menu()

        case '4':
          // DISPUTES PROCESSING
          let disputes = await processServices.processDisputes(stripe, connection).catch(e => { console.log(e); process.exit(0) });
          console.log(chalk.bgCyan('\n Results '));
          console.log(chalk.cyan('\nDisputes:'));
          console.log(chalk.cyan(' Disputes:'), disputes.disputeToFixCount);
          console.log(chalk.cyan(' New payment intent:'), disputes.newPaymentIntentCount);
          console.log(chalk.cyan(' DB payment duplication:'), disputes.duplicatedDbPaymentCount);
          console.log(chalk.red(' Error:'), disputes.errorCount);

          return menu()

        case '5':
          let transfers = await processServices.fixRent(connection, stripe).catch(e => { console.log(e); process.exit(0) });
          console.log(chalk.bgCyan('\n Results '));
          console.log(chalk.cyan('\nTransfers:'));
          console.log(chalk.cyan(' Transfers:'), transfers.transfersCount);
          console.log(chalk.cyan(' Transfers to fix:'), transfers.transfersToFixCount);
          console.log(chalk.cyan(' New transfer:'), transfers.newTransferCount);
          console.log(chalk.red(' Error:'), transfers.errorCount);
          return menu()

        case '6':
          // EXIT
          connection.end();
          return process.exit(0)
      }

      rl.close();
    });
  }
  menu()
})();
