// echo out text
// example api endpoint
export const point = {
  name: "echo",
  desc: "Test endpoint",
  run : (req, res) => res.send(req.query.text)
}
