// load .env file
require("dotenv").config();
const axios = require("axios").default;

const express = require("express");
const app = express();
app.use(express.json());

const appID = process.env.AGORA_APP_ID;

// const appCertificate = "<-- Your app certificate here -->";
// const uid = Math.floor(Math.random() * 100000);

const customerId = process.env.AGORA_CUSTOMER_ID;
const customerSecret = process.env.AGORA_CUSTOMER_SECRET;

const Authorization =
  "Basic " + Buffer.from(`${customerId}:${customerSecret}`).toString("base64");

const sendGetToken = () => {
  return process.env.AGORA_TEMP_TOKEN;
};

const sendAcquire = async (appID, channel, uid) => {
  try {
    const acquire = await axios.post(
      `https://api.agora.io/v1/apps/${appID}/cloud_recording/acquire`,
      {
        cname: channel,
        uid: uid,
        clientRequest: {
          // token: sendGetToken(),
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
        uid: uid,
        cname: channel,
        clientRequest: {
          // token: sendGetToken(),
          recordingConfig: {
            maxIdleTime: 30,
            // Both audio and video streams.
            streamTypes: 2,
            // audioProfile: 1,
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
            // subscribeVideoUids: ["123", "456"],
            // subscribeAudioUids: ["123", "456"],
            // subscribeUidGroup: 0,
          },
          recordingFileConfig: {
            avFileType: ["hls", "mp4"],
          },
          storageConfig: {
            vendor: vendor,
            region: region,
            bucket: bucket,
            accessKey: accessKey,
            secretKey: secretKey,
            fileNamePrefix: ["videos", "test"],
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
        clientRequest: {
          // token: sendGetToken(),
        },
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
  const acquireResponse = await sendAcquire(
    appID,
    req.body.channel,
    req.body.uid
  );
  if (acquireResponse.status != 200) {
    res.status(acquireResponse.status).send(acquireResponse.data);
    console.log("err1 sendAcquire");
    return;
  }

  const resourceId = acquireResponse.data.resourceId;

  const startResponse = await sendStart(
    appID,
    resourceId,
    req.body.mode,
    req.body.channel,
    req.body.uid
  );
  if (startResponse.status != 200) {
    res.status(startResponse.status).send(startResponse.data);
    console.log("err2 sendStart");
    return;
  }

  const sid = startResponse.data.sid;

  const queryRes = await sendQuery(resourceId, sid, req.body.mode);
  if (queryRes.status != 200) {
    res.status(queryRes.status).send(queryRes.data);
    console.log("err3 sendQuery");
    return;
  }

  const stopRes = await sendStop(
    resourceId,
    sid,
    req.body.mode,
    req.body.channel,
    req.body.uid
  );
  if (stopRes.status != 200) {
    res.status(stopRes.status).send(stopRes.data);
    console.log("err4 sendStop");
    return;
  }

  res.status(stopRes.status).send(stopRes.data);
  return;
});

app.get("/", (req, res) => res.send("Agora Cloud Recording Server"));

const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`Agora Cloud Recording Server listening at Port ${port}`)
);
