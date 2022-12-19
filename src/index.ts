import * as util from 'util';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import Stripe from 'stripe';
import { createConnection, Connection } from 'mysql';

async function initDb(): Promise<Connection> {
  return createConnection();
}

async function initStripe(): Promise<Stripe> {
  return new Stripe();
}

(async () => {
  const stripe = await initStripe();
  const connection = await initDb();

  //@TODO: Add the solution here!

  connection.end();
})();
