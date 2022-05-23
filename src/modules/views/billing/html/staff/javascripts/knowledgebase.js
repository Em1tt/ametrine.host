(async () => {
  try{
    let button = document?.getElementById("article-new");
    if(button){
      button.addEventListener("click", async (e) => {
        button.setAttribute("disabled", true);
        const response = await axios.post(`/api/knowledgebase/create`, {
          tags: "unfinished"
        });
        window.location.href = `/billing/staff/knowledgebase/${response.data.article_id}/editor`;
      });
    }
    let button2 = document?.getElementById("articles");
    if(button2){
      button2.addEventListener("click", async (e) => {
        button.setAttribute("disabled", true);
        window.location.href = `/billing/staff/knowledgebase/articles`;
      });
    }
    let button3 = document?.getElementById("categories");
    if(button3){
      button3.addEventListener("click", async (e) => {
        button.setAttribute("disabled", true);
        window.location.href = `/billing/staff/knowledgebase/categories`;
      });
    }
  }catch(e){
    console.error(e);
  }
})();
