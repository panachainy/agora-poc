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

const Authorization =
  "Basic " + Buffer.from(`${customerId}:${customerSecret}`).toString("base64");

const sendAcquire = async (appID, channel, uid) => {
  try {
    const acquire = await axios.post(
      `https://api.agora.io/v1/apps/${appID}/cloud_recording/acquire`,
      {
        cname: channel,
        uid: uid,
        clientRequest: {
          resourceExpiredHour: 24,
        },
      },
      { headers: { Authorization } }
    );

    return {
      status: 200,
      data: acquire.data,
    };
  } catch (e) {
    return {
      status: e.response.status,
      data: e.response.data,
    };
  }
};

const sendStart = async (appID, resource, mode, channel, uid) => {
  const bucket = process.env.S3_BUCKET;
  const accessKey = process.env.S3_ACCESS_KEY;
  const secretKey = process.env.S3_SECRET_KEY;
  const region = parseInt(process.env.S3_REGION);
  const vendor = parseInt(process.env.S3_VENDOR);

  try {
    const start = await axios.post(
      `https://api.agora.io/v1/apps/${appID}/cloud_recording/resourceid/${resource}/mode/${mode}/start`,
      {
        cname: channel,
        uid: uid,
        // token: 'xxxxxxx',
        clientRequest: {
          recordingConfig: {
            maxIdleTime: 30,
            // Both audio and video streams.
            streamTypes: 2,
            channelType: 0,
            videoStreamType: 0,
            transcodingConfig: {
              height: 640,
              width: 360,
              bitrate: 500,
              fps: 15,
              mixedVideoLayout: 1,
              backgroundColor: "#FFFFFF",
            },
          },
          recordingFileConfig: {
            avFileType: ["hls"],
          },
          storageConfig: {
            vendor: vendor,
            region: region,
            bucket: bucket,
            accessKey: accessKey,
            secretKey: secretKey,
            fileNamePrefix: ["videos"],
          },
        },
      },
      { headers: { Authorization } }
    );
    return {
      status: 200,
      data: start.data,
    };
  } catch (e) {
    return {
      status: e.response.status,
      data: e.response.data,
    };
  }
};

const sendStop = async (resource, sid, mode, channel, uid) => {
  try {
    const stop = await axios.post(
      `https://api.agora.io/v1/apps/${appID}/cloud_recording/resourceid/${resource}/sid/${sid}/mode/${mode}/stop`,
      {
        cname: channel,
        uid,
        clientRequest: {},
      },
      { headers: { Authorization } }
    );
    return {
      status: 200,
      data: stop.data,
    };
  } catch (e) {
    return {
      status: e.response.status,
      data: e.response.data,
    };
  }
};

const sendQuery = async (resource, sid, mode) => {
  try {
    const response = await axios.get(
      `https://api.agora.io/v1/apps/${appID}/cloud_recording/resourceid/${resource}/sid/${sid}/mode/${mode}/query`,
      { headers: { Authorization } }
    );

    return {
      status: 200,
      data: response.data,
    };
  } catch (e) {
    return {
      status: e.response.status,
      data: e.response.data,
    };
  }
};

// Step 1
app.post("/acquire", async (req, res) => {
  const { status, data } = await sendAcquire(
    appID,
    req.body.channel,
    req.body.uid
  );

  res.status(status).send(data);
});

// Step 2
app.post("/start", async (req, res) => {
  const { status, data } = await sendStart(
    appID,
    req.body.resource,
    req.body.mode,
    req.body.channel,
    req.body.uid
  );

  res.status(status).send(data);
});

// Step 3
app.post("/stop", async (req, res) => {
  const { status, data } = await sendStop(
    req.body.resource,
    req.body.sid,
    req.body.mode,
    req.body.channel,
    req.body.uid
  );

  res.status(status).send(data);
});

app.post("/query", async (req, res) => {
  const { status, data } = await sendQuery(
    req.body.resource,
    req.body.sid,
    req.body.mode
  );

  res.status(status).send(data);
});

app.post("/record-debug", async (req, res) => {
  const { status, data } = await sendAcquire(
    appID,
    req.body.channel,
    req.body.uid
  );

  if (status != 200) {
    res.status(status).send(data);
    console.log("err3 sendAcquire");
  }

  const { status2, data2 } = await sendStart(
    appID,
    req.body.resource,
    req.body.mode,
    req.body.channel,
    req.body.uid
  );

  if (status != 200) {
    res.status(status2).send(data2);
    console.log("err3 sendStart");
  }

  const { status3, data3 } = await sendQuery(
    req.body.resource,
    req.body.sid,
    req.body.mode
  );

  if (status != 200) {
    res.status(status3).send(data3);
    console.log("err3 sendQuery");
  }

  const { status4, data4 } = await sendStop(
    req.body.resource,
    req.body.sid,
    req.body.mode,
    req.body.channel,
    req.body.uid
  );

  if (status != 200) {
    res.status(status4).send(data4);
    console.log("err4 sendStop");
  }

  res.status(status4).send(data4);
});

app.get("/", (req, res) => res.send("Agora Cloud Recording Server"));

const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`Agora Cloud Recording Server listening at Port ${port}`)
);
