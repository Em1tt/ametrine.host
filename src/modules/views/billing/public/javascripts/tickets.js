
function dateFormatter(data) {
  let date = new Date(data).toDateString().split(" ");
  if (data == 0 || typeof data == undefined || data == null) {
    return "never";
  } else {
    if (date[2].startsWith(0)) {
      date[2] = date[2].slice(1);
    }
    if (date[2].endsWith(1)) {
      date[2] = date[2] + "st";
    } else if (date[2].endsWith(2)) {
      date[2] = date[2] + "nd";
    } else if (date[2].endsWith(3)) {
      date[2] = date[2] + "rd";
    } else {
      date[2] = date[2] + "th";
    }
    date = [date[2], date[1], date[3]].join(" ");
    return date;
  }
}
(async () => {
  const ticketsWrapper = document.getElementById("ticketWrapper");
  try {
    const urlParams = new URLSearchParams(window.location.search);
    let page = urlParams.get("page");
    if (!page || page == undefined || page == null) page = 1;
    const leftButtons = [...document.getElementsByClassName("pageLeft")],
    rightButtons = [...document.getElementsByClassName("pageRight")];
    leftButtons.forEach(button => {
      button.addEventListener("click", () => {
          window.location = `${window.location.pathname}?page=${parseInt(page) - 1}`
      });
  });
  rightButtons.forEach(button => {
      button.addEventListener("click", () => {
          window.location = `${window.location.pathname}?page=${parseInt(page) + 1}`
      });
  })
    const response = await axios.get(`/api/tickets/list?page=${page}&owned=1`);
    console.log(response);
    const tickets = response.data;
    if (tickets.length == 0) {
      if(document.body.classList.contains("loggedIn")){
        const header2 = document.createElement("h2");
        header2.classList.add("header2");
        header2.innerText = "Nothing here... Yet...";
      }
      if (page != 1 && page > 0) {
        leftButtons.forEach(button => {
            button.removeAttribute("disabled");
        })
    }
      return ticketsWrapper.appendChild(header2);
    } else {
      if (page == 1 && tickets.length == 10) {
        rightButtons.forEach(button => {
            button.removeAttribute("disabled");
        })
    } else if (page != 1 && page > 0 && tickets.length == 10) {
        rightButtons.forEach(button => {
            button.removeAttribute("disabled");
        })
        leftButtons.forEach(button => {
            button.removeAttribute("disabled");
        })
    } else if (page != 1 && page > 0 && tickets.length < 10) {
        leftButtons.forEach(button => {
            button.removeAttribute("disabled");
        })
    }
      tickets.forEach((ticket) => {
        if (ticket == null) return;
        let opened = dateFormatter(ticket.opened);
        console.log(ticket);
        let edited = dateFormatter(ticket.editedIn);
        const clickable = document.createElement("a");
        const header = document.createElement("h2");
        header.classList.add("header1");
        header.style = "margin-inline: auto;";
        header.innerText = `#${ticket.ticket_id}`;
        clickable.href = `./tickets/${ticket.ticket_id}`;
        ticketsWrapper.appendChild(clickable);
        clickable.appendChild(header);
        const div = document.createElement("div");
        clickable.appendChild(div);
        const h3 = document.createElement("h3");
        const abbr = document.createElement("abbr");
        abbr.title = ticket.subject;
        abbr.innerText = ticket.subject;
        h3.appendChild(abbr);
        div.appendChild(h3);
        const hr = document.createElement("hr");
        hr.classList.add("semanticLine");
        div.appendChild(hr);
        const p1 = document.createElement("p");
        p1.innerText = "Created on: ";
        const span1 = document.createElement("span");
        span1.innerText = opened;
        p1.appendChild(span1);
        div.appendChild(p1);
        const p4 = document.createElement("p");
        const span3 = document.createElement("span");
        span3.innerText = edited;
        p4.innerText = "Last edit: ";
        p4.appendChild(span3);
        div.appendChild(p4);
        const p2 = document.createElement("p");
        p2.innerText = "Service: ";
        const span2 = document.createElement("span");
        span2.innerText = "none";
        p2.appendChild(span2);
        div.appendChild(p2);
        const footer = document.createElement("footer");
        footer.classList.add(
          ticket.status == 0
            ? "awaitingStaff"
            : ticket.status == 1
              ? "closed"
              : ticket.status == 2
                ? "awaitingClient"
                : "answered"
        );
        const i = document.createElement("i");
        i.classList.add("fa");
        i.classList.add(
          ticket.status == 0
            ? "fa-clock"
            : ticket.status == 1
              ? "fa-times-circle"
              : ticket.status == 2
                ? "fa-exclamation-circle"
                : "fa-check-circle"
        );
        footer.appendChild(i);
        const p3 = document.createElement("p");
        p3.innerText =
          ticket.status == 0
            ? "Awaiting Staff Reply"
            : ticket.status == 1
              ? "Closed"
              : ticket.status == 2
                ? "Awaiting Client Reply"
                : "Answered";
        footer.appendChild(p3);
        clickable.appendChild(footer);
      });
    }
  } catch (e) {
    console.log(e);
    if(document.body.classList.contains("loggedIn")){
      const header2 = document.createElement("h2");
      header2.classList.add("header2");
      header2.innerText = "Nothing here... Yet...";
    }
    return ticketsWrapper.appendChild(header2);
  }
})();

document.getElementById("createTicket").addEventListener("click", () => {
  window.location.href = './tickets/create';
});