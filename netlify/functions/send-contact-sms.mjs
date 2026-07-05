const requiredEnvVars = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "CONTACT_SMS_TO",
];

const getField = (data, name) => {
  const value = data?.[name];
  return typeof value === "string" ? value.trim() : "";
};

const getTrialTemplateName = () => {
  const value = process.env.TWILIO_TRIAL_TEMPLATE_NAME;
  if (!value) {
    return "";
  }

  return value.trim().replace(/^["']|["']$/g, "").trim();
};

const buildMessage = (data) => {
  const trialTemplateName = getTrialTemplateName();
  if (trialTemplateName) {
    return trialTemplateName;
  }

  const name = getField(data, "name") || "Unknown";
  const email = getField(data, "email") || "No email";
  const phone = getField(data, "phone") || "No phone";
  const eventDate = getField(data, "event_date") || "No date";

  return [
    "New Kaylina Norton inquiry",
    `Name: ${name}`,
    `Date: ${eventDate}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
    "Check Netlify Forms/email for the full message.",
  ].join("\n");
};

const sendSms = async (body) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const toNumber = process.env.CONTACT_SMS_TO;

  const params = new URLSearchParams({
    To: toNumber,
    Body: body,
  });

  if (messagingServiceSid) {
    params.set("MessagingServiceSid", messagingServiceSid);
  } else if (fromNumber) {
    params.set("From", fromNumber);
  } else {
    throw new Error(
      "Set either TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID.",
    );
  }

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString(
    "base64",
  );

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twilio SMS failed: ${response.status} ${errorText}`);
  }
};

export default {
  async formSubmitted(event) {
    const data = event?.data ?? {};
    const formName = getField(data, "form-name");
    const trialTemplateName = getTrialTemplateName();

    if (formName && formName !== "contact") {
      return;
    }

    const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);
    if (missingEnvVars.length > 0) {
      throw new Error(`Missing env vars: ${missingEnvVars.join(", ")}`);
    }

    console.log(
      trialTemplateName
        ? `Sending Twilio trial template SMS: ${trialTemplateName}`
        : "Sending Twilio custom contact alert SMS",
    );

    await sendSms(buildMessage(data));
  },
};
