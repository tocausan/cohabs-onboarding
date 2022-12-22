/*

Manual script or cron job to check Stripe disputes and fix them ?

A) Dispute payment ticket
The dispute is due to the bank considering the payment as a fraud.
The dispute charge process is the following:
 - Create a payment in Stripe
 - Find the payment in the database
 - Duplicate the disputed payment in the database and update the values

B) Fix rents that not transferred


*/


import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import Stripe from 'stripe';
import { createConnection, Connection } from 'mysql';
import chalk from 'chalk'
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

  console.log(chalk.cyan('\nPLease run'), chalk.bold("'yarn run start:cli'"), chalk.cyan('to enter the automation script.\n'))

  /*
    const cashBalanceTransactions = await stripe.customers.listCashBalanceTransactions(
      'cus_MyvONSw0FVVr4D',
      {}
    );
    console.log(cashBalanceTransactions.data)
  */

  /*
    const transfers = await stripe.transfers.list()
    transfers.data.map(t => {
      console.log(t)
  
      console.log('\nTransfer id:\t', t.id)
  
      if (t.transfer_group && t.transfer_group !== '') {
        console.log('Transfer group:\t', t.transfer_group)
      } else {
        console.log('Transfer group:\t', 'Not found')
      }
    })
    */

  //const payment = await stripe.customers.createBalanceTransaction('cus_MyvONSw0FVVr4D', { amount: 1000, currency: 'eur', type: 'payment' });
  //console.log(payment)

  // ———————————————————
  // DATABASE RESTORATION (restored)
  //  await DbServices.restoreDump('./assets/cohabs_onboarding.dump').catch(e => { console.log(e); process.exit(0) });

  // ———————————————————
  // DISPUTES PROCESSING
  //await processServices.processDisputes(stripe, connection).catch(e => { console.log(e); process.exit(0) });

  connection.end();
})();
