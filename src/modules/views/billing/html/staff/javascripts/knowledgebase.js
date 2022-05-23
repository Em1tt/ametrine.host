(async () => {
  try{
    let button = document.getElementById("article-new")
    button.addEventListener("click", async (e) => {
      button.setAttribute("disabled", true);
      const response = await axios.post(`/api/knowledgebase/create`, {
        tags: "unfinished"
      });
      window.location.href = `/billing/staff/knowledgebase/${response.data.article_id}/editor`;
    });
  }catch(e){
    console.error(e);
  }
})();
