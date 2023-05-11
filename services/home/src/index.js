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
      return res.render("index", {
        title: "issuer",
        detail: "detail",
        EXTERNAL_PORT
      })
    case "private-state-token-redeemer.glitch.me":
      return res.render("index", {
        title: "redeemer",
        detail: "detail",
        EXTERNAL_PORT
      })
  }
})

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
})
