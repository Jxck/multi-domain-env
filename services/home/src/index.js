// DSP
import express from "express"
import { readFileSync } from "fs"
import { promisify } from "util";
import { resolve } from "path"
import * as childProcess from "child_process";
const { EXTERNAL_PORT, PORT } = process.env

const exec = promisify(childProcess.exec);

// console.log(await exec("./bin/example"))

const Y = readFileSync(`${resolve("./")}/keys/pub_key.txt`)
  .toString()
  .trim()

const app = express()

app.use((req, res, next) => {
  // const host = req.headers.host.split(".").at(0).toUpperCase()
  // const token = process.env[`${host}_TOKEN`]
  res.setHeader("Origin-Trial", "token")
  next()
})

app.use(
  express.static("src/public", {
    setHeaders: (res, path, stat) => {
      if (path.endsWith("main.js")) {
        return res.set("X-Custom-Header", "howdy")
      }
    }
  })
)
app.set("view engine", "ejs")
app.set("views", "src/views")

app.get("/.well-known/trust-token/key-commitment", async (req, res) => {
  console.log(req.path)
  const protocol_version = "PrivateStateTokenV1VOPRF"

  // 1 year later
  const expiry = ((Date.now() + 1000 * 60 * 60 * 24 * 365) * 1000).toString()

  const key_commitment = {}
  key_commitment[protocol_version] = {
    protocol_version,
    id: 1,
    batchsize: 1,
    keys: {
      1: { Y, expiry }
    }
  }

  res.set({
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json; charset=utf-8"
  })

  const json = JSON.stringify(key_commitment, "", " ")
  console.log(json)
  res.send(json)
})

app.get(`/private-state-token/issuance`, async (req, res) => {
  console.log(req.path)
  console.log(req.headers)
  const sec_trust_token = req.headers["sec-private-state-token"]
  console.log({ sec_trust_token })

  const result = await exec(`${resolve("./")}/bin/main --issue ${sec_trust_token}`)
  const token = result.stdout
  console.log({ token })
  res.set({ "Access-Control-Allow-Origin": "*" })
  res.append("sec-private-state-token", token)
  res.send()
})

app.get(`/.well-known/private-state-token/redemption`, async (req, res) => {
  console.log(req.path)
  console.log(req.headers)
  const sec_trust_token_version = req.headers["sec-private-state-token-version"]
  if (sec_trust_token_version !== protocol_version) {
    return res.send(400).send("unsupported trust token version")
  }
  const sec_trust_token = req.headers["sec-private-state-token"]
  if (sec_trust_token.match(BASE64FORMAT) === null) {
    return res.status(400).send("invalid trust token")
  }
  const result = await exec(`./bin/main --redeem ${sec_trust_token}`)
  const token = result.stdout
  res.set({ "Access-Control-Allow-Origin": "*" })
  res.append("sec-private-state-token", token)
  res.send()
})

app.get(`/.well-known/private-state-token/send-rr`, async (req, res) => {
  console.log(req.path)

  const headers = req.headers
  console.log({ headers })

  // sec-redemption-record
  // [(<issuer 1>, {"redemption-record": <SRR 1>}),
  //  (<issuer N>, {"redemption-record": <SRR N>})],
  const rr = sfv.decodeList(headers["sec-redemption-record"])
  console.log({ rr })

  const { value, params } = rr[0]
  const redemption_record = Buffer.from(params["redemption-record"]).toString()
  console.log({ redemption_record })

  // verify client_public_key
  const sec_signature = sfv.decodeDict(headers["sec-signature"])
  const signatures = sec_signature.signatures.value[0]
  const client_public_key = signatures.params["public-key"]
  const sig = signatures.params["sig"]

  console.log({ sec_signature })
  console.log({ signatures })
  console.log({ client_public_key })
  console.log({ sig })

  // verify sec-signature
  const canonical_request_data = new Map([
    ["destination", REDEEMER],
    ["sec-redemption-record", headers["sec-redemption-record"]],
    ["sec-time", headers["sec-time"]],
    ["sec-private-state-tokens-additional-signing-data", headers["sec-private-state-tokens-additional-signing-data"]],
    ["public-key", client_public_key]
  ])

  console.log(canonical_request_data)

  const cbor_data = map(canonical_request_data)
  const prefix = Buffer.from(headers["sec-private-state-token-version"])
  console.log({ prefix })
  const signing_data = new Uint8Array([...prefix, ...cbor_data])

  console.log({
    sig,
    signing_data,
    client_public_key,
    sig_len: sig.length,
    signing_data_len: signing_data.length,
    client_public_key_len: client_public_key.length
  })

  const key = await webcrypto.subtle.importKey(
    "raw",
    client_public_key,
    {
      name: "ECDSA",
      namedCurve: "P-256"
    },
    true,
    ["verify"]
  )

  console.log(key)

  // verify by Node Crypto
  const key_object = KeyObject.from(key)
  console.log(key_object)

  const sig_verify = await promisify(verify)("SHA256", signing_data, key_object, sig)
  console.log({ sig_verify })

  res.set({ "Access-Control-Allow-Origin": "*" })
  res.send({ sig_verify })
})

app.get("/", async (req, res) => {
  const host = req.headers.host
  console.log({ host })
  switch (host) {
    case "private-state-token-demo.glitch.me":
      return res.render("index", {
        title: "home",
        detail: "detail",
        EXTERNAL_PORT
      })
    case "private-state-token-issuer.glitch.me":
      return res.render("issuer", {
        title: "issuer",
        detail: "detail",
        EXTERNAL_PORT
      })
    case "private-state-token-redeemer.glitch.me":
      return res.render("redeemer", {
        title: "redeemer",
        detail: "detail",
        EXTERNAL_PORT
      })
    default:
      console.error(`invalid domain ${host}`)
      return
  }
})

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
})
