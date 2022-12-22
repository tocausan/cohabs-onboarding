# Challenge A
## <br>
## Issue 1: MySQL connnection
\
<b>'mysql' module cannot connect to the mysql database, is there any incentive to keep it or shall we switch to 'mysql2' module ?</b>
<br><br>
The following error appears :
```bash
code: 'ER_NOT_SUPPORTED_AUTH_MODE',
errno: 1251,
sqlMessage: 'Client does not support authentication protocol requested by server; consider upgrading MySQL client',
sqlState: '08004',
fatal: true
```

Solution: had another mysql DB on Docker, mysql is working fine


## <br>
## Issue 2: Charge disputed payment: Create Stripe payment
\
"Description →  ‘INVOICE - ’ + Invoice number (INVOICE - aec002003). "<br>
"If the disputed payment has not invoice, put the same description in capital letters".

<b>What should be in capital letters if no invoice ?</b>

Solution: add the description of the disputed payment, in capital letters to signify an automation

## <br>
## Issue 4: Charge disputed payment: Create Stripe payment
Bank transfer payment method seems to be disabled on Stripe dev mode.

Solution: use "Cash Balance" payment method because in France.

## <br>
## Issue 3: Charge disputed payment: Find the payment in DB
<br>
- Customer: Federico Valverde. The db has no Federico Valverde.
- Amount: 1500. The db has no lease of 1500 (nor 750 x2).

Solution: use cohabs_support_challenge.dump, there are 1500 payment with Stripe charge id
<b></b>


## <br>
## Issue 4: Charge disputed payment: Create Stripe payment
<br>
Bank transfer payment method seems to be disabled on Stripe dev mode.

## <br>
## Issue 5: Charge disputed payment: Create db duplicate payment
<br>
Error while trying to insert a duplicate payment in the DB. The ID cannot be NULL nor the same as original payment (primary key). It doesn't seem to be auto-generated either.
<br><br>

```bash
mysql> describe payments;
+-----------------+---------------+------+-----+---------+-------+
| Field           | Type          | Null | Key | Default | Extra |
+-----------------+---------------+------+-----+---------+-------+
| id              | varchar(32)   | NO   | PRI | NULL    |       |
| amount          | decimal(10,2) | NO   |     | NULL    |       |
| paid            | decimal(10,2) | NO   |     | 0.00    |       |
| pending         | tinyint(1)    | NO   |     | 0       |       |
| dueDate         | datetime      | NO   |     | NULL    |       |
| paymentDate     | datetime      | YES  |     | NULL    |       |
| comment         | varchar(1024) | YES  |     | NULL    |       |
| retries         | int(11)       | NO   |     | 0       |       |
| stripeChargeId  | varchar(64)   | YES  |     | NULL    |       |
| stripeInvoiceId | varchar(64)   | YES  |     | NULL    |       |
| createdAt       | datetime      | NO   |     | NULL    |       |
| updatedAt       | datetime      | NO   |     | NULL    |       |
| leaseId         | varchar(32)   | NO   |     | NULL    |       |
| userId          | varchar(32)   | YES  |     | NULL    |       |
| disputed        | tinyint(1)    | NO   |     | 0       |       |
+-----------------+---------------+------+-----+---------+-------+

mysql> INSERT INTO payments (id, amount, paid, pending, dueDate, paymentDate, comment, retries, stripeChargeId, stripeInvoiceId, createdAt, updatedAt, leaseId, userId, disputed) VALUES ("w0lpcdui9c9ncewlrmctv3fttgyl50oi", 1500, 0, 1, "2023-01-20 14:50:07", NULL, "Created from the dispute ID: dp_1MFFVOA69JWLHl3JHpWfP3RV", 0, "pi_3MFFVNA69JWLHl3J1SH4RAUi", NULL, "2022-12-21 14:50:07", "2022-12-21 14:50:07", "ewlrmctv3fta2sa20oiw0lpcdui9c9nc", NULL, 0);

ERROR 1062 (23000): Duplicate entry 'w0lpcdui9c9ncewlrmctv3fttgyl50oi' for key 'PRIMARY'
```

Solution: create a random string as ID (not the best solution, but it works)
```bash
CONCAT('yo', FLOOR(RAND() * 1000000000000000000000000000), 'meh')
# yo479737472235911960000000000meh
```


## <br>
## Issue 6: Charge disputed payment: Create Stripe payment
<br>
A balance payment has been created on Stripe but no charge id linked to it. Therefor the payment duplicate keeps the original charge id.


## <br>
## Issue 7: Creation of customers, products and subscriptions in Stripe
<br>
The price of the product is supposed to be in the <b>baseRent</b> field but the field is empty in the database.
Shouldn't is be the <b>rent</b> field instead ?

## <br>
## Issue 8: Creation of customers, products and subscriptions in Stripe
<br>
The sql query to select users id, rooms id and leases id is not working.
```bash
mysql> SELECT users.id, rooms.id, leases.userId, leases.roomId FROM users FULL JOIN leases ON users.id = leases.userId FULL JOIN rooms ON leases.roomId = rooms.id;
ERROR 1064 (42000): You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'FULL JOIN rooms ON leases.roomId = rooms.id' at line 1
```

Solution: implement it in javascript.


## <br>
## Issue 9: Creation of subscriptions in Stripe
<br>
Only 2 leases link correctly to user and room. Most of their userId is incorrect.
When creating subscriptions, only 1 is created, not 2 as expected.