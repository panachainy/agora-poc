// load .env file
require("dotenv").config();
const axios = require("axios").default;

const express = require("express");
const app = express();
app.use(express.json());

const appID = process.env.AGORA_APP_ID;
const appCertificate = "<-- Your app certificate here -->";
const uid = Math.floor(Math.random() * 100000);

const customerId = process.env.AGORA_CUSTOMER_ID;
const customerSecret = process.env.AGORA_CUSTOMER_SECRET;

const authToken = Buffer.from(`${customerId}:${customerSecret}`).toString(
  "base64"
);

// step 1
app.post("/acquire", async (req, res) => {
  const Authorization = `Basic ${authToken}`;

  console.log("req.body", req.body);
  console.log("appID", appID);

  try {
    const acquire = await axios.post(
      `https://api.agora.io/v1/apps/${appID}/cloud_recording/acquire`,
      {
        cname: req.body.channel,
        uid: req.body.uid,
        clientRequest: {
          resourceExpiredHour: 24,
        },
      },
      { headers: { Authorization } }
    );

    res.send(acquire.data);
  } catch (e) {
    console.log("error", e.response.status);
    console.log("error", e.response.data);

    res.status(400);
    res.send();
  }
});

// step 2
app.post("/start", (req, res) => {
  // Start Cloud Recording Here
});

app.get("/", (req, res) => res.send("Agora Cloud Recording Server"));

const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`Agora Cloud Recording Server listening at Port ${port}`)
);
