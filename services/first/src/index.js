// DSP
import express from "express"

const { EXTERNAL_PORT, PORT } = process.env

const app = express()

app.use((req, res, next) => {
  const host = req.headers.host.split(".").at(0).toUpperCase()
  const token = process.env[`${host}_TOKEN`]
  res.setHeader("Origin-Trial", token)
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
  const host = req.headers.host.split(".").at(0).toUpperCase()
  const title = process.env[`${host}_HOST`]
  const detail = process.env[`${host}_DETAIL`]
  console.log({ host, title, detail })
  res.render("index", { title, detail, EXTERNAL_PORT })
})

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
})
