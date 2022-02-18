(async () => {
    try {
        const response = await axios.get("/api/knowledgebase/tags");
    
        VirtualSelect.init({
          ele: "#searchbar",
          options: response.data.map((i) => {
            return { label: i, value: i };
          }),
          multiple: true,
          search: true,
          placeholder: "Find articles with tags",
          showValueAsTags: true,
        });
      } catch (e) {
        console.error(e);
      }
      try{
        const params = new Proxy(new URLSearchParams(window.location.search), {
            get: (searchParams, prop) => searchParams.get(prop),
          });
        const tags = JSON.parse(params.tags);
        const response = await axios.get(`/api/knowledgebase/list?tags=${encodeURIComponent(JSON.stringify(tags))}`);
        console.log(response);
      }catch(e){
        console.error(e);
      }
})()