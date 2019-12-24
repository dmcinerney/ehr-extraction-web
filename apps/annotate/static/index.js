var states = {};
$(document).ready(function(){
    setProgress();
    populateTabs();
    includeHTML();
});

function setProgress() {
    var progress_bar = d3.select(".progress")
      .append("div")
      .attr("class", "progress-bar")
      .attr("role", "progressbar")
      .attr("aria-valuemin", 0)
      .attr("aria-valuemax", num_instances)
    updateProgressBar(progress_bar, progress);
}

function onReady() {
    d3.selectAll(".panel_vis").each(function(d){
      if (d[3] == 'annotate') {
          states[d[0]] = new AnnotateState(d3.select(this), d[5], d[6]);
      } else {
          states[d[0]] = new ValidateState(d3.select(this), d[5], d[6]);
      }});
    if (file_from_server) {
        getFile();
    }
}

function onReportsLoaded(tab_results) {
    d3.selectAll(".panel_vis")
      .each(function(d){
        var state = states[d[0]];
        state.initReports(tab_results[d[4]]); });
}

function populateTabs(){
    d3.select("#tabs").html("");
    d3.select("#tabs").selectAll("li")
      .data(tabs)
      .enter()
      .append("li")
        .append("a")
          .attr("class", function(d){ return "nav-item nav-link "+d[3]+"-tab"; })
          .classed("active", function(d, i){ return i == 0; })
          .attr("id", function(d){ return d[0]+"-tab"; })
          .attr("data-toggle", "tab")
          .attr("href", function(d){ return "#"+d[0]+"-panel"; })
          .attr("role", "tab")
          .attr("aria-controls", function(d){ return d[0]+"-panel"; })
          .attr("aria-selected", function(d, i){ return String(i == 0); })
          .html(function(d){ return d[1]; });
    d3.select("#panels").html("");
    tab_panels = d3.select("#panels").selectAll("div")
      .data(tabs)
      .enter()
      .append("div")
        .attr("class", "tab_panel tab-pane fade")
        .classed("show active", function(d, i){ return i == 0; })
        .attr("id", function(d){ return d[0]+"-panel"; })
        .attr("role", "tabpanel")
        .attr("aria-labelledby", function(d){ return d[0]+"-tab"; })
        .append("div")
          .style("height", "100%")
          .style("display", "flex")
          .style("flex-direction", "column");
    tab_panels.append("text").html(function(d){ return d[2]; });
    tab_panels.append("div")
      .style("flex", 1)
      .style("display", "flex")
      .style("flex-direction", "column")
      .style("min-height", 0)
      .attr("id", function(d){ return d[0]+"-vis"; })
      .attr("class", "panel_vis")
      .attr("w3-include-html", function(d){ return "/static/annotate.html"; });
}

// taken from https://www.w3schools.com/howto/howto_html_include.asp
function includeHTML() {
  var z, i, elmnt, file, xhttp;
  /*loop through a collection of all HTML elements:*/
  z = document.getElementsByTagName("*");
  for (i = 0; i < z.length; i++) {
    elmnt = z[i];
    /*search for elements with a certain atrribute:*/
    file = elmnt.getAttribute("w3-include-html");
    if (file) {
      /*make an HTTP request using the attribute value as the file name:*/
      xhttp = new XMLHttpRequest();
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4) {
          if (this.status == 200) {elmnt.innerHTML = this.responseText;}
          if (this.status == 404) {elmnt.innerHTML = "Page not found.";}
          /*remove the attribute, and call this function once more:*/
          elmnt.removeAttribute("w3-include-html");
          includeHTML();
        }
      }
      xhttp.open("GET", file, true);
      xhttp.send();
      /*exit the function:*/
      return;
    }
  }
  onReady();
};

function getFile() {
    url = 'http://localhost:5000/get_file';
    var formData = new FormData();
    if (!file_from_server) {
        var x = document.getElementById("reports_file");
        formData.append("reports", x.files[0]);
    } else {
        if (file == "False") {
            d3.select("body").html("Done!");
            return;
        }
    }
    displayLoader(d3.select("#loader_div"));
    $.post({
        url: url,
        data: formData,
        success: function(result, status){
            d3.select("#patient_mrn").html("Patient MRN: "+result["patient_mrn"]);
            onReportsLoaded(result["tab_results"]);
            closeLoader(d3.select("#loader_div"));
        },
        processData: false,
        contentType: false,
    });
}


function displayLoader(selection) {
    selection.append("div")
        .attr("class", "loader");
}

function closeLoader(selection) {
    selection.selectAll(".loader").remove();
}

function submit() {
    url = 'http://localhost:5000'
    var formData = new FormData();
    formData.append("hello", "world");
    $.post({
        url: url,
        data: formData,
        success: function(result, status){
            location.reload();
        },
        processData: false,
        contentType: false,
    });
}
