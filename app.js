const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { poolPromise } = require("./db");
const guardianRoute = require('./routes/guardianRoute');
const nomineeRoute = require('./routes/nomineeRoute');
const branchRoute = require('./routes/branchRoute');
const schemeRoute = require('./routes/schemeRoute');
const validationRoute = require('./routes/validationRoute');
const goldrateRoute = require('./routes/rateRoute');
const draftRoute = require('./routes/draftRoute');
const documentlist = require('./routes/documentRoute');
const receiptRoute = require('./routes/receiptRoute');

const paymentlink = require('./paymentidgen');
const paymentstatus = require('./createpaymentlink');
const paymentupdate = require('./paymentupdate');
const webhook = require('./webhook');
const customerdata = require('./customerdata');
const imagefetch = require('./imagefetch');
const draftcustomer = require('./draftcustomer');

const PORT = 9000;

const app = express();
app.use(morgan('dev'));

app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString(); // capture raw JSON string
  }
}));

app.use(
  cors({
    origin: '*',
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

//new routes /////////

app.use('/api', guardianRoute);
app.use('/api', nomineeRoute);
app.use('/api', branchRoute);
app.use('/api', schemeRoute);
app.use('/api', validationRoute);
app.use('/api', goldrateRoute);
app.use('/api', draftRoute);
app.use('/api', documentlist)
app.use('/api', receiptRoute)

app.use('/api/linkid', paymentlink)
app.use('', paymentstatus)
app.use('/api/paymentupdate', paymentupdate)
app.use('/api/webhook', webhook)
app.use('/api/customerdetails', customerdata)
app.use('/', imagefetch)
app.use('/api/draftcustomer', draftcustomer)

// Set up routes
// app.use('/api/guardiandetails', guardianRoute);
// app.use('/api/nomineedetails', nomineeRoute);
// app.use('/api/branchdetails', branchRoute);
// app.use('/api', schemeRoute);
// app.use('/api/goldrate', goldrateRoute);
// app.use('/api/draftenrollment',imageupload);
// app.use('/api/doclist',documentlist)
// app.use('/api/linkid',paymentlink)
// app.use('',paymentstatus)
// app.use('/api/paymentupdate',paymentupdate)
// app.use('/api/webhook',webhook)
// app.use('/api/customerdetails',customerdata)
// app.use('/',imagefetch)
// app.use('/api/resposne',response)
// app.use('/api/draftcustomer',draftcustomer)

// Connect to the database
const initializeDatabase = async () => {
  try {
    const pool = await poolPromise; // Create a pool connection
    console.log('Connected to the database successfully.');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1); // Exit process if the database connection fails
  }
};

// Initialize database connection before starting the server
initializeDatabase();

app.listen(PORT, () => {
  console.log(`Port runnin on ${PORT}`)
});
