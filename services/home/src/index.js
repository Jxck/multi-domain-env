// DSP
import express from "express"

const { EXTERNAL_PORT, PORT } = process.env

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

app.post(`/.well-known/trust-token/issuance`, async (req, res) => {
  console.log(req.path)
  console.log(req.headers)
  const sec_trust_token = req.headers["sec-trust-token"]
  console.log({ sec_trust_token })
  if (sec_trust_token.match(BASE64FORMAT) === null) {
    return res.status(400).send("invalid trust token")
  }
  const result = await exec(`./bin/main --issue ${sec_trust_token}`)
  const token = result.stdout
  console.log({ token })
  res.set({ "Access-Control-Allow-Origin": "*" })
  res.append("sec-trust-token", token)
  res.send()
})

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
})
