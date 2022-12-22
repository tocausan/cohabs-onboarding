import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import chalk from 'chalk';
import Stripe from 'stripe';
import { Connection } from 'mysql';
import moment from 'moment'

const ProcessServices = {
   synchStripeCustomers: async function (stripe: Stripe, connection: Connection): Promise<{ hasBeenCreatedCount: Number, alreadyExistsCount: Number, errorCount: Number }> {
      async function getDbUsers(): Promise<Array<any>> {
         return new Promise((resolve, reject) => {
            return connection.query('SELECT * FROM users', async (error, results) => {
               if (error) reject(error)
               resolve(results)
            })
         })
      }

      async function updateStripeCustomerId(email: string, stripeCustomerId: string): Promise<void> {
         return new Promise((resolve, reject) => {
            return connection.query(`UPDATE users SET stripeCustomerId='${stripeCustomerId}' WHERE email='${email}'`, async (error, results) => {
               if (error) reject(error)
               resolve()
            })
         })
      }

      console.log(chalk.bgCyan('\n Synch DB Users to Stripe Customers'))

      // get database users
      const users: Array<any> = await getDbUsers().catch(e => { console.log(e); process.exit(0) })

      // set return variables
      let hasBeenCreatedCount = 0
      let alreadyExistsCount = 0
      let errorCount = 0

      // loop through users
      for (let user of users) {
         // create stripe customer

         // create payment method (required for subscription creation)
         const paymentMethod: Stripe.PaymentMethod = await stripe.paymentMethods.create({
            type: 'card',
            card: {
               number: '4242424242424242',
               exp_month: 8,
               exp_year: 2025,
               cvc: '314',
            },
         });

         const stripeCustomerData: Stripe.CustomerCreateParams = {
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            metadata: user,
            payment_method: paymentMethod.id,
         }

         let stripeCustomerId = ''

         // check if the customer already exists
         const customers: Stripe.ApiList<Stripe.Customer> = await stripe.customers.list({ email: stripeCustomerData.email }).catch(e => { console.log(e); process.exit(0) })

         if (customers.data.length > 0) {
            // update database user with stripeCustomerId
            await updateStripeCustomerId(user.email, customers.data[0].id.toString()).catch(e => { console.log(e); process.exit(0) })
            stripeCustomerId = customers.data[0].id.toString()
            alreadyExistsCount++
         } else {
            // create customer if it doesn't exist
            const customer: Stripe.Customer = await stripe.customers.create(stripeCustomerData).catch(e => { console.log(e); process.exit(0) })
            // update database user with stripeCustomerId
            await updateStripeCustomerId(user.email, customer.id.toString()).catch(e => { console.log(e); process.exit(0) })
            stripeCustomerId = customer.id.toString()
            hasBeenCreatedCount++
         }

         // display results
         console.log(chalk.cyan('\nName:'), stripeCustomerData.name)
         console.log(chalk.cyan('StripeCustomerId:'), stripeCustomerId)
         console.log(chalk.cyan('Status:'), customers.data.length > 0 ? chalk.gray('Already exists') : chalk.green('Created'))
      }

      return { hasBeenCreatedCount, alreadyExistsCount, errorCount }
   },

   synchStripeProducts: async function (stripe: Stripe, connection: Connection): Promise<{ hasBeenCreatedCount: Number, alreadyExistsCount: Number, errorCount: Number }> {
      async function getDbRooms(): Promise<Array<any>> {
         return new Promise((resolve, reject) => {
            return connection.query('SELECT * FROM rooms', async (error, results) => {
               if (error) reject(error)
               resolve(results)
            })
         })
      }

      async function updateStripeProductId(name: string, stripeProductId: string): Promise<void> {
         return new Promise((resolve, reject) => {
            return connection.query(`UPDATE rooms SET stripeProductId='${stripeProductId}' WHERE location='${name}'`, async (error, results) => {
               if (error) reject(error)
               resolve()
            })
         })
      }

      console.log(chalk.bgCyan('\n Synch DB Rooms to Stripe Products'))

      // get database rooms
      const rooms: Array<any> = await getDbRooms().catch(e => { console.log(e); process.exit(0) })

      // set return variables
      let hasBeenCreatedCount = 0
      let alreadyExistsCount = 0
      let errorCount = 0

      // loop through rooms
      for (let room of rooms) {
         // create stripe product
         const price = room.rent ? parseInt(room.rent) * 100 : 0 // convert price to cents
         const stripeProductData: Stripe.ProductCreateParams = {
            name: room.location,
            active: room.active ? true : false,
            description: room.description,
            default_price_data: {
               currency: 'eur',
               unit_amount: price,
               recurring: { interval: 'month' },
            },
            metadata: room
         }

         let stripeProductId = ''

         // check if the product already exists
         const products: Stripe.ApiSearchResult<Stripe.Product> = await stripe.products.search({
            query: `metadata[\'id\']:\'${room.id}\'`,
         }).catch(e => { console.log(e); process.exit(0) })

         if (products.data.length > 0) {
            // update database room with stripeProductId
            await updateStripeProductId(stripeProductData.name, products.data[0].id.toString()).catch(e => { console.log(e); process.exit(0) })
            stripeProductId = products.data[0].id.toString()
            alreadyExistsCount++
         } else {
            const product: Stripe.Product = await stripe.products.create(stripeProductData).catch(e => { console.log(e); process.exit(0) })
            stripeProductId = product.id.toString()
            hasBeenCreatedCount++
         }

         // display results
         console.log(chalk.cyan('\nName:'), stripeProductData.name)
         console.log(chalk.cyan('Price:'), stripeProductData.default_price_data)
         console.log(chalk.cyan('Active:'), stripeProductData.active)
         console.log(chalk.cyan('Description:'), stripeProductData.description)
         console.log(chalk.cyan('StripeProductId:'), stripeProductId)
         console.log(chalk.cyan('Status:'), products.data.length > 0 ? chalk.gray('Already exists') : chalk.green('Created'))
      }

      return { hasBeenCreatedCount, alreadyExistsCount, errorCount }
   },

   synchStripeSubscriptions: async function (stripe: Stripe, connection: Connection): Promise<{ hasBeenCreatedCount: Number, alreadyExistsCount: Number, errorCount: Number }> {
      async function getDbLeases(): Promise<Array<any>> {
         return new Promise((resolve, reject) => {
            return connection.query('SELECT * FROM leases', async (error, results) => {
               if (error) reject(error)
               resolve(results)
            })
         })
      }

      async function getDbLeaseUser(userId: string): Promise<Array<any>> {
         return new Promise((resolve, reject) => {
            return connection.query(`SELECT * FROM users WHERE id='${userId}'`, async (error, results) => {
               if (error) reject(error)
               resolve(results)
            })
         })
      }

      async function getDbLeaseRoom(roomId: string): Promise<Array<any>> {
         return new Promise((resolve, reject) => {
            return connection.query(`SELECT * FROM rooms WHERE id='${roomId}'`, async (error, results) => {
               if (error) reject(error)
               resolve(results)
            })
         })
      }

      async function updateStripeSubscriptionId(id: string, stripeSubscriptionId: string): Promise<void> {
         return new Promise((resolve, reject) => {
            return connection.query(`UPDATE leases SET stripeSubscriptionId='${stripeSubscriptionId}' WHERE id='${id}'`, async (error, results) => {
               if (error) reject(error)
               resolve()
            })
         })
      }

      console.log(chalk.bgCyan('\n Synch DB Leases to Stripe Subscriptions'))

      // get database leases
      const leases: Array<any> = await getDbLeases().catch(e => { console.log(e); process.exit(0) })

      // set return variables
      let hasBeenCreatedCount = 0
      let alreadyExistsCount = 0
      let errorCount = 0

      // loop through leases
      for (let lease of leases) {
         const users: Array<any> = await getDbLeaseUser(lease.userId).catch(e => { console.log(e); process.exit(0) })
         const rooms: Array<any> = await getDbLeaseRoom(lease.roomId).catch(e => { console.log(e); process.exit(0) })

         console.log(chalk.cyan('\nLease:'), lease.id)
         console.log(chalk.cyan('User id:'), lease.userId)
         console.log(chalk.cyan('Room id:'), lease.roomId)

         if (users.length <= 0) console.log(chalk.cyan('User:'), chalk.red('Not found'))
         else console.log(chalk.cyan('User:'), chalk.green('Found'))
         if (rooms.length <= 0) console.log(chalk.cyan('Room:'), chalk.red('Not found'))
         else console.log(chalk.cyan('Room:'), chalk.green('Found'))

         // process only if room and user exist
         if (users.length > 0 && rooms.length > 0) {
            // create stripe subscription

            // get user payment method
            const customers: Stripe.ApiSearchResult<Stripe.Customer> = await stripe.customers.search({
               query: `metadata[\'id\']:\'${users[0].id}\'`,
            }).catch(e => { console.log(e); process.exit(0) })

            // retrieve payment method
            let paymentMethodId = ''

            if (customers.data.length > 0) {
               const paymentMethods: Stripe.ApiList<Stripe.PaymentMethod> = await stripe.customers.listPaymentMethods(
                  customers.data[0].id,
                  { type: 'card' }

               ).catch(e => { console.log(e); process.exit(0) });
               if (paymentMethods.data.length > 0) {
                  paymentMethodId = paymentMethods.data[0].id.toString()
                  console.log(chalk.cyan('Payment method:'), paymentMethodId)
               } else console.log(chalk.cyan('Payment method:'), chalk.red('Not found'))
            }

            // get room price
            const products: Stripe.ApiSearchResult<Stripe.Product> = await stripe.products.search({
               query: `metadata[\'id\']:\'${rooms[0].id}\'`,
            }).catch(e => { console.log(e); process.exit(0) })

            let isProductActive = products.data.length > 0 ? products.data[0].active : false

            // set subscription data
            const stripeSubscriptionsData: Stripe.SubscriptionCreateParams = {
               customer: users[0].stripeCustomerId,
               items: [],
               default_payment_method: paymentMethodId,
               metadata: lease,
            }

            // price item
            if (products.data.length > 0 && products.data[0].default_price) stripeSubscriptionsData.items?.push({ price: products.data[0].default_price?.toString(), quantity: 1 })

            let stripeSubscriptionId = ''

            // check if the product already exists
            const subscriptions: Stripe.ApiSearchResult<Stripe.Subscription> = await stripe.subscriptions.search({
               query: `metadata[\'id\']:\'${lease.id}\'`,
            }).catch(e => { console.log(e); process.exit(0) })

            // create subscription only id payment method exists and product is active
            if (paymentMethodId !== '' && isProductActive) {
               if (subscriptions.data.length > 0) {
                  // update database lease with stripeSubscriptionId
                  await updateStripeSubscriptionId(lease.id, subscriptions.data[0].id.toString()).catch(e => { console.log(e); process.exit(0) })
                  stripeSubscriptionId = subscriptions.data[0].id.toString()
                  alreadyExistsCount++
               } else {
                  const subscription: Stripe.Subscription = await stripe.subscriptions.create(stripeSubscriptionsData).catch(e => { console.log(e); process.exit(0) })
                  stripeSubscriptionId = subscription.id.toString()
                  hasBeenCreatedCount++
               }

               // display results
               console.log(chalk.cyan('StripeCustomerId:'), stripeSubscriptionsData.customer)
               console.log(chalk.cyan('StripeProductId:'), stripeSubscriptionsData.items)
               console.log(chalk.cyan('StripeSubscriptionId:'), stripeSubscriptionId)
               console.log(chalk.cyan('Status:'), subscriptions.data.length > 0 ? chalk.gray('Already exists') : chalk.green('Created'))

            } else {
               // missing payment method or product is inactive
               console.log(chalk.cyan('Status:'), chalk.red('Error:'), 'Missing payment method or product is inactive.')
               errorCount++
            }
         } else {
            // missing user or room
            console.log(chalk.cyan('Status:'), chalk.red('Error:'), 'Missing user or room.')
            errorCount++
         }
      }

      return { hasBeenCreatedCount, alreadyExistsCount, errorCount }
   },

   // process disputes
   processDisputes: async function (stripe: Stripe, connection: Connection): Promise<{ disputeToFixCount: Number, newPaymentIntentCount: Number, duplicatedDbPaymentCount: Number, errorCount: Number }> {
      // get list of disputes
      const disputes: Stripe.ApiList<Stripe.Dispute> = await stripe.disputes.list();

      let disputeToFixCount = 0
      let newPaymentIntentCount = 0
      let duplicatedDbPaymentCount = 0
      let errorCount = 0

      console.log(chalk.bgCyan('\n Processing disputes \n'))

      // loop through disputes
      for (let dispute of disputes.data) {
         console.log(chalk.cyan('---------------------------'))
         console.log(chalk.cyan('Dispute:'))
         console.log(chalk.cyan(' Id:'), dispute.id)
         console.log(chalk.cyan(' Payment intent ID:'), dispute.payment_intent)

         disputeToFixCount++

         // local variables
         let paymentIntentId: string = ''
         let balanceTransactionId: string = ''
         let invoiceId: string = ''
         let customerId: string = ''
         let newPaymentIntentData = {
            amount: dispute.amount,
            currency: dispute.currency,
            payment_method_types: ['bank_transfer'],
            description: '',
         }

         // ——————————————————————
         // DISPUTE INFOS GATERING

         // find the dispute invoice (payment_intent -> invoice)
         if (dispute.payment_intent) {
            const paymentIntent: Stripe.PaymentIntent = await stripe.paymentIntents.retrieve(dispute.payment_intent.toString());
            paymentIntentId = paymentIntent.id
            // catch the customer ID
            if (paymentIntent.customer) customerId = paymentIntent.customer.toString()

            // check if invoice exists
            if (paymentIntent.invoice) {
               console.log(chalk.cyan(' Invoice:'), paymentIntent.invoice)

               invoiceId = paymentIntent.invoice.toString()

               const invoice: Stripe.Invoice = await stripe.invoices.retrieve(paymentIntent.invoice.toString());
               newPaymentIntentData.description = 'INVOICE - ' + invoice.id
            }
            else {
               console.log(chalk.cyan(' Invoice:'), chalk.red('Not found'))
               newPaymentIntentData.description = `INVOICE - ${moment().format('DD/MM/YYYY')} - DISPUTE ID: ${dispute.id}, USER: ${dispute.evidence.customer_name?.toUpperCase()}, AMOUNT: ${dispute.amount / 100} ${dispute.currency.toUpperCase()}`
            }
         }

         // ——————————————————
         // NEW PAYMENT INTENT

         console.log()
         console.log(chalk.cyan('New payment intent '))
         console.log(chalk.cyan(' Customer:'), customerId)

         /*
         // this is not a cash balance !
         // create a cash balance transaction to the customer
         const newPaymentIntent = await stripe.customers.createBalanceTransaction(customerId, { amount: newPaymentIntentData.amount, currency: newPaymentIntentData.currency, description: newPaymentIntentData.description });
         */

         // check customer cash balance
         const cashBalance: Stripe.CashBalance = await stripe.customers.retrieveCashBalance(customerId);
         if (cashBalance.available) {
            console.log(chalk.cyan(' Cash balance:'), cashBalance.available)

            const balanceTransaction = await stripe.customers.createBalanceTransaction(
               customerId,
               {
                  amount: -newPaymentIntentData.amount,
                  currency: newPaymentIntentData.currency,
                  description: 'DISPUTE - ' + dispute.id
               }
            );

            if (balanceTransaction) {
               console.log(chalk.cyan(' Balance transaction:'), balanceTransaction.id)

               balanceTransactionId = balanceTransaction.id

               // increment new payment intent count
               if (balanceTransaction.id) newPaymentIntentCount++
               else console.log(chalk.cyan(' Status:'), chalk.red('Error:'), 'New payment intent not created.')

            } else {
               errorCount++
               console.log(chalk.cyan(' Status:'), chalk.red('Error:'), 'New cash balance not created.')
            }
         }
         else {
            errorCount++
            console.log(chalk.cyan(' Status:'), chalk.red('Error:'), 'Cash balance not available')
         }

         // display new payment intent infos
         console.log(chalk.cyan(' Amount:'), newPaymentIntentData.amount)
         console.log(chalk.cyan(' Currency:'), newPaymentIntentData.currency)
         console.log(chalk.cyan(' Description:'), newPaymentIntentData.description)

         // find the payment in the database that is disputed and with the same amount
         console.log()
         console.log(chalk.cyan('Duplicate database payment '))

         async function getDbPayment(): Promise<Array<Object>> {
            return new Promise((resolve, reject) => {
               connection.query(`select * from payments where disputed = 1 AND amount = ${dispute.amount / 100} ORDER BY paymentDate DESC`, (error, result, fields) => {
                  if (error) reject(error);
                  resolve(result);
               });
            });
         }

         // ————————————————————————————
         // DATABASE PAYMENT DUPLICATION

         let dbPayments: Array<Object> = await getDbPayment().catch(e => { console.log(e); process.exit(0) });

         if (dbPayments.length == 0) console.log(chalk.cyan(' DB payment:'), chalk.red('No payment found in database for this amount, please check manually.'))
         else if (dbPayments.length > 1) console.log(chalk.cyan(' DB payment:'), chalk.red('Multiple diputed payments found in database for this amount, please check manually.'))
         else {
            // continue if db payment is found and unique

            // this charge id is the one from the orginal payment intent
            // TODO: find the new payment intent charge id ?

            // duplicate the payment in the database with the new payment intent infos
            // preferred method here is get existing db payment and create a new one base on it using js with updated values
            async function duplicateDbPayment(originalPayment: any, chargeId: string, disputeInvoiceId: string, amount: number, comment: string): Promise<Array<Object>> {
               return new Promise((resolve, reject) => {
                  /*
                     id: 'w0lpcdui9c9ncewlrmctv3fttgyl50oi',            set to random string
                     amount: 1500,                                      set to amount of dispute
                     paid: 1500,                                        set to 0 because it is not paid yet
                     pending: 0,                                        set to 1 because it is pending
                     dueDate: 2022-12-15T22:55:45.000Z,                 set a new due date
                     paymentDate: 2022-12-15T22:55:45.000Z,             set to null because it is not paid yet
                     comment: null,                                     add comment
                     retries: 0,
                     stripeChargeId: 'ch_3MFFVNA69JWLHl3J1IeUu14U',     set to new charge id
                     stripeInvoiceId: 'NULL',
                     createdAt: 2022-12-15T22:55:45.000Z,               set a new created at
                     updatedAt: 2022-12-15T22:55:45.000Z,               set a new updated at
                     leaseId: 'ewlrmctv3fta2sa20oiw0lpcdui9c9nc',
                     userId: null,
                     disputed: 1                                        set to 0 because it is a new payment therefor not disputed
                  */

                  const dateFormat = 'YYYY-MM-DD HH:mm:ss'
                  // set the due date to 30 days laters and format it to "2022-12-15 23:55:45"
                  const createdAt = moment().format(dateFormat)
                  const dueDate = moment().add(30, 'days').format(dateFormat)

                  connection.query(
                     `INSERT INTO payments(id, amount, paid, pending, dueDate, paymentDate, comment, retries, stripeChargeId, stripeInvoiceId, createdAt, updatedAt, leaseId, userId, disputed) ` +
                     `VALUES(` +
                     `CONCAT('yo', FLOOR(RAND() * 1000000000000000000000000000), 'meh'), ` +
                     `${amount ? amount / 100 : 'NULL'}, ` +
                     `0, ` +
                     `1, ` +
                     `"${dueDate}", ` +
                     `NULL, ` +
                     `"${comment}", ` +
                     `${originalPayment.retries}, ` +
                     `"${chargeId}", ` +
                     `${disputeInvoiceId ? '"' + disputeInvoiceId + '"' : 'NULL'}, ` +
                     `"${createdAt}", ` +
                     `"${createdAt}", ` +
                     `${originalPayment.leaseId ? '"' + originalPayment.leaseId + '"' : 'NULL'}, ` +
                     `${originalPayment.userId ? '"' + originalPayment.userId + '"' : 'NULL'}, ` +
                     `0); `, (error, result, fields) => {
                        if (error) reject(error);
                        resolve(result);
                     })
               })
            }

            // add the dispute id to the comment
            const comment = 'Created from the dispute ID: ' + dispute.id + ', cash balance transaction ID: ' + balanceTransactionId

            // duplicate the payment in the database
            await duplicateDbPayment(dbPayments[0], balanceTransactionId, invoiceId, dispute.amount, comment)
               .catch(e => { console.log(e); process.exit(0) });

            duplicatedDbPaymentCount++
            console.log(chalk.cyan(' Status: '), 'Payment duplicated in database.')
         }

         console.log(chalk.cyan('---------------------------\n'))
      }

      return { disputeToFixCount, newPaymentIntentCount, duplicatedDbPaymentCount, errorCount }
   },
}

export default ProcessServices