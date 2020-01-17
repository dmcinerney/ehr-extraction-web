class State {
    constructor(annotation_element, valid_queries, with_custom) {
        this.annotation_element = annotation_element;
        if (!valid_queries) {
            this.tags = Object.keys(descriptions);
            this.disabled = new Set([]);
        } else {
            this.tags = valid_queries;
            var alltags = new Set(Object.keys(descriptions));
            var tags = new Set(this.tags);
            this.disabled = new Set([...alltags].filter(x => !tags.has(x)));
        }
        this.with_custom = with_custom;
        this.tag_sentences = {};
        this.sentence_tags = {};
        this.selected_sentence = null;
        this.report_selected_sentences = {};
        this.current_result = null;
        this.addOnClicks();
        this.switchToTagSentences();
        this.populateTagSelector(this.annotation_element.select("#tag"), custom_tags.concat(this.tags).concat(Array.from(this.disabled)), undefined, this.disabled);
        this.htags = {};
        this.populateHTagSelector(this.annotation_element.select('#htag0'), hierarchy["options"][hierarchy["start"]], undefined, this.disabled);
    }
    initReports(current_result) {
        this.current_result = current_result;
        this.populateReportSelector();
        this.makeReports();
        this.chooseReport();
    }
    switchToTagSentences(){
        this.annotation_element.select("#tag_sentences").classed("selected", true);
        this.annotation_element.select("#sentence_tags").classed("selected", false);
    }
    switchToSentenceTags(){
        this.annotation_element.select("#tag_sentences").classed("selected", false);
        this.annotation_element.select("#sentence_tags").classed("selected", true);
    }
    tagSentence(i, tag, refresh=true){
        if (tag == 'default') {
            this.selected_sentence = i;
            this.switchToSentenceTags();
            this.displaySentenceTags(i);
        } else {
            if (this.tag_sentences[tag] != null && this.tag_sentences[tag].has(i)) {
                alert("tag already present for this sentence");
            } else {
                this.annotation_element.select("#sentence_"+i).classed("selected", true);
                if (!(i in this.sentence_tags)) { this.sentence_tags[i] = new Set([]); }
                this.sentence_tags[i].add(tag);
                if (!(tag in this.tag_sentences)) { this.tag_sentences[tag] = new Set([]); }
                this.tag_sentences[tag].add(i);
                var report = this.annotation_element.select("#sentence_"+i).attr("report_id");
                if (!(report in this.report_selected_sentences)) { this.report_selected_sentences[report] = new Set([]); }
                this.report_selected_sentences[report].add(i+"_"+tag);
                if (refresh) {
                    this.refreshSummary();
                }
            }
        }
    }
    refreshSummary() {
        this.displayTokenizedSummary();
        if (this.selected_sentence) { this.displaySentenceTags(this.selected_sentence); }
        this.boldTags();
        this.boldReports();
    }
    untagSentence(i, tag, refresh=true) {
        this.sentence_tags[i].delete(tag);
        if (this.sentence_tags[i].size == 0) {
            this.annotation_element.select("#sentence_"+i).classed("selected", false);
            this.annotation_element.select("#sentence_"+i+"_tags").remove();
            delete this.sentence_tags[i];
        }
        this.tag_sentences[tag].delete(i);
        if (this.tag_sentences[tag].size == 0) {
            this.annotation_element.select("#t_"+tag_idxs[tag]).remove();
            delete this.tag_sentences[tag];
        }
        var report = this.annotation_element.select("#sentence_"+i).attr("report_id");
        this.report_selected_sentences[report].delete(i+"_"+tag);
        if (this.report_selected_sentences[report].size == 0) {
            delete this.report_selected_sentences[report];
        }
        if (refresh) {
             this.refreshSummary();
        }
    }
    refreshTagSelectors() {
        // TODO: refresh all Tag Selectors
    }
    populateHTagSelector(tag_selector, tags, default_option="Select a Tag", disabled=new Set([])) {
//        $(tag_selector).on("hidden.bs.select", function(){ $(this).trigger("changed.bs.select"); });
        if (!(tag_selector.attr("base_id") in this.htags)) {
            this.htags[tag_selector.attr("base_id")] = [];
        }
        this.htags[tag_selector.attr("base_id")].push(tag_selector);
        var temp_this = this;
        tag_selector.attr("selecting_children", "false");
        $(tag_selector.node()).on("shown.bs.select", function(){
          d3.select("div.dropdown-menu.show").selectAll("li")
            .each(function(d, i){
              d3.select(this).classed("disabled", false)
                .select("a").on("click", function(){ if(tag_selector.node().selectedIndex == i){tag_selector.on("change").bind(tag_selector.node())();} });
              var tag_idx = i;
              if (temp_this.with_custom){ tag_idx = tag_idx-1; }
              if (tag_idx <= 0 || !(tags[tag_idx-1] in hierarchy["options"])){ return; }
              // add button
              d3.select(this).selectAll("button")
                .data([0])
                .enter()
                  .append("button")
                    .attr("class", "btn btn-secondary btn-sm forward_button")
                    .html("<b>&gt;</b>")
                    .each(function(){
                      var listitem = d3.select(this.parentNode)
                        .style("padding-right", function(){
                          console.log((parseInt(window.getComputedStyle(d3.select(this).node(), null).getPropertyValue('padding-right'))+30)+"px");
                          return (parseInt(window.getComputedStyle(d3.select(this).node(), null).getPropertyValue('padding-right'))+30)+"px"; }); })
                    .on("click", function(){
                      tag_selector.node().selectedIndex = i;
                      $(tag_selector.node()).selectpicker('refresh');
                      tag_selector.attr("selecting_children", "true");
                      console.log("clicked arrow");
                      tag_selector.on("change").bind(tag_selector.node())();
              });
            });
          });
        this.populateTagSelector(tag_selector, tags, default_option, disabled);
    }
    populateTagSelector(tag_selector, tags, default_option="Select a Tag", disabled=new Set([])) {
        tag_selector.attr("data-container", "body");
        tag_selector.html("");
        tag_selector.append("option")
          .attr("value", "default")
          .attr("index", 0)
          .attr("id", tag_selector.attr("id")+"_option_"+tag_idxs["default"])
          .html(default_option)
          .attr("disabled", true);
        if (this.with_custom) {
            tag_selector.append("option")
              .attr("value", "custom")
              .attr("description", "")
              .attr("index", 1)
              .attr("id", tag_selector.attr("id")+"_option_"+tag_idxs["custom"])
              .html("Add a Custom Tag: \"\"");
        }
        var temp_this = this;
        tag_selector.selectAll(".tags")
          .data(tags)
          .enter()
          .append("option")
            .attr("value", function(d) { return d; })
            .attr("description", function(d) { return descriptions[d]; })
            .attr("index", function(d, i) {
              if (temp_this.with_custom) { i = i+1; }
              return i+1; })
            .attr("id", function(d) { return tag_selector.attr("id")+"_option_"+tag_idxs[d]; })
            .each(function(d){
              if (disabled.has(d)) { d3.select(this).attr("disabled", "true"); }; })
            .html(getTagString);
        $(tag_selector.node()).selectpicker('refresh');
        if (this.with_custom) {
//            $(d3.select("div.dropdown-menu.show").select(".bs-searchbox").select("input").node()).on("input", function() {
            $("#"+tag_selector.attr("id")+" ~ div.dropdown-menu:first > div.bs-searchbox > input", this.annotation_element.node()).on("input", function() {
              var text = $(this).val();
              if (text != tag_selector.select("#"+tag_selector.attr("id")+"_option_"+tag_idxs["custom"]).attr("description")) {
                  tag_selector.select("#"+tag_selector.attr("id")+"_option_"+tag_idxs["custom"])
                    .attr("description", text)
                    .html("Add a Custom Tag: \""+text+"\"");
                  $(tag_selector.node()).selectpicker('refresh');
                  $(this).trigger("input");
              }});
        }
    }
    populateReportSelector() {
        this.annotation_element.select("#report")
          .selectAll("option")
          .data(this.current_result.original_reports)
          .enter()
          .append("option")
            .attr("value", function(d) { return d[0]; })
            .html(function(d) { return d[1]+', '+(new Date(d[2])).toDateString(); })
        $("#report", this.annotation_element.node()).selectpicker('refresh');
        var progress_bar = this.annotation_element.select(".progress")
          .append("div")
          .attr("class", "progress-bar")
          .attr("role", "progressbar")
          .attr("aria-valuemin", 0)
          .attr("aria-valuemax", this.current_result.original_reports.length);
        updateProgressBar(progress_bar, this.annotation_element.select("#report").node().selectedIndex+1);
    }
    makeReports() {
        var reports_text_div = this.annotation_element.select("#reports_div").select(".custom_text");
        reports_text_div.html("");
        var report_p = reports_text_div.selectAll("p")
          .data(this.current_result.sentence_spans)
          .enter()
          .append("p")
            .attr("class", "report_p");
        var divs_for_sentence_and_in_between = report_p.selectAll("div")
          .data(function(d, i) { return d.map(function(e){ return [i, e]; }); })
          .enter()
          .append("div")
            .style("display", "inline");

        var temp_this = this;
        // Add anything in orginal report before the sentence
        divs_for_sentence_and_in_between
          .append("text")
            .html(function(d, i) {
              if (i == 0) {
                  var start = 0;
              } else {
                  var start = temp_this.current_result.sentence_spans[d[0]][i-1][2];
              }
              var end = d[1][1];
              var raw_text = temp_this.current_result.original_reports[d[0]][3].slice(start, end);
              return raw_text.replace(/\n/g, "<br />"); });

        // Add the sentence
        divs_for_sentence_and_in_between
          .append("text")
            .attr("id", function(d) { return "sentence_"+d[1][0]; })
            .attr("sentence", function(d) { return d[1][0]; })
            .attr("selected", "false")
            .attr("class", "reports_sentence")
            .attr("report_id", function(d) { return d[0]; })
            .on("click", function() { temp_this.selectSentence(d3.select(this));console.log(d3.select(this).attr("sentence")); })
            .html(function(d) {
              var raw_text = temp_this.current_result.original_reports[d[0]][3].slice(d[1][1], d[1][2]);
              return raw_text.replace(/\n/g, "<br />"); });

        // Add anything in original report after the last sentence
        report_p.append("div")
          .append("text")
          .html(function(d, i) {
            if (temp_this.current_result.sentence_spans[i].length <= 0) {
                return temp_this.current_result.original_reports[i][3]
            }
            var start = temp_this.current_result.sentence_spans[i][temp_this.current_result.sentence_spans[i].length-1][2];
            var end = temp_this.current_result.original_reports[i][3].length;
            var raw_text = temp_this.current_result.original_reports[i][3].slice(start, end);
            return raw_text.replace(/\n/g, "<br />"); });
    }
    selectSentence(sentence_text) {
        sentence_text.interrupt("highlightMomentarily");
        var tag_selector = this.annotation_element.select("#tag").node();
        var tag = tag_selector.options[tag_selector.selectedIndex].value;
        this.tagSentence(sentence_text.attr("sentence"), tag);
    }
    chooseReport() {
        var report = this.annotation_element.select("#report").node().selectedIndex;
        this.annotation_element.select("#reports_div").select(".custom_text").selectAll(".report_p")
          .classed("selected", function(d, i) { return i == report; });
        this.annotation_element.select(".report_p.selected").node().scrollIntoView({block: "start"});
        this.annotation_element.select("#previous").classed("disabled", this.annotation_element.select("#report").node().selectedIndex == 0);
        this.annotation_element.select("#next").classed("disabled", this.annotation_element.select("#report").node().selectedIndex == this.current_result.original_reports.length-1);
        $("#report", this.annotation_element.node()).selectpicker('refresh');
        updateProgressBar(this.annotation_element.select(".progress-bar"), report+1);
    }
    displaySentenceTags(i) {
        var sentence_tags = this.annotation_element.select("#sentence_tags");
        var sentence_header = sentence_tags.select("#sentenceheader").selectAll("div").data(this.current_result.tokenized_text[i]);
        sentence_header.exit().remove();
        sentence_header.enter().append("div").style("display", "inline").each(displayTokenizedSentence);
        sentence_header.each(displayTokenizedSentence);
        var sentence_tags_list = sentence_tags.select(".custom_text").select("ul").html("");
        var temp_this = this;
        var list_item = sentence_tags_list.selectAll("li")
          .data(function(){
            if (temp_this.sentence_tags[i] != null) {
                return Array.from(temp_this.sentence_tags[i]).map(function(e){ return [i, e]; })
            } else {
                return [];
            }})
          .enter()
          .append("li")
            .attr("class", "sentence_tag")
            .attr("id", function(d) { return "sentence_tag_"+d[0]+"_"+d[1]; })
            .attr("tag", function(d) { return d[1]; })
            .attr("sentence", function(d) { return d[0]; });
        list_item.append("text")
          .attr("class", "sentence_tag_text")
          .html(function(d) { return getTagString(d[1]); })
          .on("click", function() {
            var tag = d3.select(this.parentNode).attr("tag");
            temp_this.annotation_element.select("#tag").node().selectedIndex = temp_this.annotation_element.select("#tag_option_"+tag_idxs[tag]).attr("index");
            temp_this.chooseTag();
            var sentence_num = d3.select(this.parentNode).attr("sentence");
            var sentence = temp_this.annotation_element.select("#summary_sentence_"+tag_idxs[tag]+"_"+sentence_num);
            sentence.node().scrollIntoView({block: "center"});
            temp_this.highlightMomentarily(sentence.select(".summary_sentence_text")); });
        this.addAnnotationButton(list_item);
    }
    displayTokenizedSummary() {
        var temp_this = this;
        var tag_sentences_div = this.annotation_element.select("#tag_sentences").select(".custom_text");
        tag_sentences_div.html("");
        var summary_p = tag_sentences_div.selectAll("p")
          .data(Object.keys(this.tag_sentences))
          .enter()
          .append("p")
            .attr("class", "summary_p")
            .attr("tag", function(d) { return d; })
            .attr("id", function(d) { return "t_"+tag_idxs[d]; });
        summary_p.append("p")
          .attr("class", "tagheader")
          .html(getTagString);
        var sentence_p = summary_p.selectAll(".summary_sentence")
          .data(function(d) { return Array.from(temp_this.tag_sentences[d]).sort(function(a,b){return temp_this.sortNumber(a, b);}).map(function(e){ return [d, e]; }); })
          .enter()
          .append("p")
            .attr("class", "summary_sentence")
            .attr("id", function(d) { return "summary_sentence_"+tag_idxs[d[0]]+"_"+d[1]; })
            .attr("tag", function(d) { return d[0]; })
            .attr("sentence", function(d) { return d[1]; });
        sentence_p.append("div")
          .attr("class", "summary_sentence_text")
          .on("click", function() {
            var sentence_num = d3.select(this.parentNode).attr("sentence");
            var sentence = temp_this.annotation_element.select("#sentence_"+sentence_num);
            temp_this.annotation_element.select("#report").node().selectedIndex = sentence.attr("report_id");
            temp_this.chooseReport();
            sentence.node().scrollIntoView({block: "center"});
            temp_this.highlightMomentarily(sentence); })
          .selectAll("div")
          .data(function(d) { return temp_this.current_result.tokenized_text[d[1]]; })
          .enter()
          .append("div")
            .style("display", "inline")
            .each(displayTokenizedSentence);
        this.addAnnotationButton(sentence_p);
        this.displayTag();
    }
    addAnnotationButton(senttag_container) {
        var temp_this = this;
        senttag_container.append("button")
          .attr("class", "btn btn-outline-danger btn-sm")
          .on("click", function(){
            var sentence_num = d3.select(this.parentNode).attr("sentence");
            var tag = d3.select(this.parentNode).attr("tag");
            temp_this.untagSentence(sentence_num, tag); })
          .html("<span aria-hidden=\"true\">&times;</span>");
    }
    chooseTag() {
        var temp_this = this;
        this.selectTag(this.annotation_element.select("#tag"), "htag");
        this.displayTag();
        this.switchToTagSentences();
    }
    selectTag(tag_selector, htag_selector_id) {
        var tag = tag_selector.node().options[tag_selector.node().selectedIndex].value;
        var htags = this.htags[htag_selector_id];
        if (tag == "default") {
            tag_selector = htags[0];
            tag_selector.node().selectedIndex = 0;
            $(tag_selector.node()).selectpicker('refresh');
            this.addSubHTag(tag_selector, false);
        } else {
            if (tag == "custom") {
                addCustomTag(tag_selector.select("#"+tag_selector.select("id")+"_option_"+tag_idxs["custom"]).attr("description"));
                tag_selector.node().selectedIndex = tag_selector.select("#"+tag_selector.select("id")+"_option_"+tag_idxs["custom"]).attr("index");
                $(tag_selector.node()).selectpicker('refresh');
                tag = "custom"+custom_tags.length;
            }
            var linearization = hierarchy["linearizations"][tag];
            console.log(linearization);
            var node = hierarchy["start"];
            for (var i = 0; i < linearization.length; i++) {
                var tag_selector = htags[i];
                var index = linearization[i];
                var node = hierarchy["options"][node][index];
                var tag_index = tag_selector.select("#"+tag_selector.attr("id")+"_option_"+tag_idxs[node]).attr("index");
                tag_selector.node().selectedIndex = tag_index;
                $(tag_selector.node()).selectpicker('refresh');
                this.addSubHTag(tag_selector, false);
            }
        }
    }
    chooseHTag(tag_selector) {
        var temp_this = this;
        if (!(this.selectHTag(tag_selector, "tag"))) {
            this.displayTag();
            this.switchToTagSentences();
        }
    }
    selectHTag(htag_selector, tag_selector_id) {
        var tag = htag_selector.node().options[htag_selector.node().selectedIndex].value;
        if (tag == "custom") {
            addCustomTag(htag_selector.select("#"+htag_selector.attr("id")+"_option_"+tag_idxs["custom"]).attr("description"));
            htag_selector.node().selectedIndex = htag_selector.select("#"+htag_selector.attr("id")+"_option_"+tag_idxs["custom"]).attr("index");
            $(htag_selector.node()).selectpicker('refresh');
            tag = "custom"+custom_tags.length;
        }
        var open_after = htag_selector.attr("selecting_children") == "true";
        this.addSubHTag(htag_selector, open_after);
        if (!(open_after)) {
            this.annotation_element.select("#"+tag_selector_id).node().selectedIndex = this.annotation_element.select("#"+tag_selector_id+"_option_"+tag_idxs[tag]).attr("index");
            $(this.annotation_element.select("#"+tag_selector_id).node()).selectpicker('refresh');
        }
        return open_after;
    }
    addSubHTag(tag_selector, open_after) {
        var base_id = tag_selector.attr("base_id");
        var htags = this.htags[base_id];
        var num = Number(tag_selector.attr("num"));
        for (var i = htags.length-1; i > num; i--) {
            var last_tag_selector = htags.pop();
            //d3.select(last_tag_selector.node().parentNode).remove();
            $(last_tag_selector.node()).selectpicker('destroy');
            last_tag_selector.remove();
            console.log("removing "+i);
        }
        var tag = tag_selector.node().options[tag_selector.node().selectedIndex].value;
        if (tag in hierarchy["options"]){
            var options = hierarchy["options"][tag];
            var next_tag_selector = d3.select(tag_selector.node().parentNode.parentNode).append("select")
              .attr("class", "selectpicker")
              .attr("data-live-search", "true")
              .attr("num", num+1)
              .attr("base_id", base_id)
              .attr("id", base_id+(num+1))
              .on("change", tag_selector.on("change"));
            if (open_after) {
                console.log("selecting_children");
                tag_selector.attr("selecting_children", "false");
                $(next_tag_selector.node()).on("loaded.bs.select", function(){
                  $(next_tag_selector.node()).selectpicker('toggle'); });
            }
            this.populateHTagSelector(next_tag_selector, options, undefined, this.disabled);
        }
    }
    displayTag() {
        var tag_selector = this.annotation_element.select("#tag").node();
        var tag = tag_selector.options[tag_selector.selectedIndex].value;
        if (tag == "default") {
            this.annotation_element.selectAll(".summary_p")
              .classed("selected", true);
        } else {
            this.annotation_element.selectAll(".summary_p")
              .classed("selected", function() { return d3.select(this).attr("tag") == tag; });
        }
    }
    sortNumber(a, b) {
        return a - b;
    }
    boldTags() {
        var temp_this = this;
        this.annotation_element.select("#tag").selectAll("option").classed("bold_option", function(){
          var tag = d3.select(this).attr("value");
          if (tag == "default") {
              return false;
          } else {
              return temp_this.tag_sentences[tag] != null && temp_this.tag_sentences[tag].size > 0;
          }})
        $("#tag", this.annotation_element.node()).selectpicker('refresh');
    }
    boldReports() {
        var temp_this = this;
        this.annotation_element.select("#report").selectAll("option").classed("bold_option", function(d, i){
          return i in temp_this.report_selected_sentences; });
        $("#report", this.annotation_element.node()).selectpicker('refresh');
    }
    highlightMomentarily(selection) {
        selection
          .interrupt("highlightMomentarily");
        var original_color = selection.style("border-color");
        selection
          .style("border-color", "red")
          .transition("highlightMomentarily").duration(2000)
          .on("interrupt", function(){ selection.style("border-color", null); })
          .on("end", function(){ selection.style("border-color", null); })
          .style("border-color", original_color);
    }
    nextReport() {
        this.annotation_element.select("#report").node().selectedIndex = this.annotation_element.select("#report").node().selectedIndex+1;
        this.chooseReport();
    }
    previousReport() {
        this.annotation_element.select("#report").node().selectedIndex = this.annotation_element.select("#report").node().selectedIndex-1;
        this.chooseReport();
    }
    showAllSummaries() {
        var tag_selector = this.annotation_element.select("#tag");
        tag_selector.node().selectedIndex = 0;
        $(tag_selector.node()).selectpicker("refresh");
        this.chooseTag();
    }
    addOnClicks() {
        var temp_this = this;
        this.annotation_element.select("#previous").on("click", function(){ temp_this.previousReport(); })
        this.annotation_element.select("#report").on("change", function(){ temp_this.chooseReport(); })
        this.annotation_element.select("#next").on("click", function(){ temp_this.nextReport(); })
        this.annotation_element.select("#tag").on("change", function(){ temp_this.chooseTag(); });
        this.annotation_element.select("#htag0").on("change", function(){ temp_this.chooseHTag(d3.select(this)); });
        this.annotation_element.select("#show_all").on("click", function(){ temp_this.showAllSummaries(); });
    }
}

class AnnotateState extends State{
    constructor(annotation_element, valid_queries, with_custom) {
        super(annotation_element, valid_queries, with_custom);
        var temp_this = this;
        var sentence_tag = this.annotation_element.select("#sentence_tags").append("select")
          .attr("class", "selectpicker")
          .attr("data-live-search", "true")
          .attr("id", "sentence_tag")
          .on("change", function(){ temp_this.addSentenceTag(); });
        var sentence_htag = this.annotation_element.select("#sentence_tags").append("div")
          .attr("class", "buttons htag_container")
            .append("select")
            .attr("class", "selectpicker")
            .attr("data-live-search", "true")
            .attr("num", 0)
            .attr("base_id", "sentence_htag")
            .attr("id", "sentence_htag0")
            .on("change", function(){ temp_this.addSentenceHTag(d3.select(this)); });
        this.populateTagSelector(sentence_tag, custom_tags.concat(this.tags).concat(Array.from(this.disabled)), "Add a tag", this.disabled);
        this.populateHTagSelector(sentence_htag, hierarchy["options"][hierarchy["start"]], "Add a tag", this.disabled);
    }
    addSentenceTag() {
        var tag_selector = this.annotation_element.select("#sentence_tag")
        var temp_this = this;
        this.selectTag(tag_selector, "sentence_htag");
        var tag = tag_selector.node().options[tag_selector.node().selectedIndex].value;
        this.tagSentence(this.selected_sentence, tag);
        this.displaySentenceTags(this.selected_sentence);
        tag_selector.node().selectedIndex = 0;
        $(tag_selector.node()).selectpicker("refresh");
        this.selectTag(tag_selector, "sentence_htag");
        this.switchToSentenceTags();
    }
    addSentenceHTag(tag_selector) {
        var temp_this = this;
        if (!this.selectHTag(tag_selector, "sentence_tag")) {
            var tag = tag_selector.node().options[tag_selector.node().selectedIndex].value;
            this.tagSentence(this.selected_sentence, tag);
            this.displaySentenceTags(this.selected_sentence);
            tag_selector = this.annotation_element.select("#sentence_htag0");
            tag_selector.node().selectedIndex = 0;
            $(tag_selector.node()).selectpicker("refresh");
            this.selectHTag(tag_selector, "sentence_tag");
            this.switchToSentenceTags();
        }
    }
}


class ValidateState extends State {
    constructor(validation_element, valid_queries, with_custom) {
        super(validation_element, valid_queries, with_custom);
        this.heatmap = "sentence_level_attention";
        this.cached_results = {};
        this.checked_senttags = {};
    }
    selectSentence(sentence_text) {
        this.showAllSummaries();
        this.selected_sentence = sentence_text.attr("sentence");
        this.switchToSentenceTags();
        this.displaySentenceTags(sentence_text.attr("sentence"));
    }
    addAnnotationButton(senttag_container) {
        var checkbox_container = senttag_container.append("div")
          .attr("class", "custom-control custom-checkbox form-control-lg");
        var temp_this = this;
        checkbox_container.append("input")
          .attr("type", "checkbox")
          .attr("class", "custom-control-input")
          .attr("id", function(d) { return "checkbox_"+d[0]+"_"+d[1]; })
          .each(function(d, i){
            var sentence_num = d3.select(this.parentNode.parentNode).attr("sentence");
            var tag = d3.select(this.parentNode.parentNode).attr("tag");
            var senttag = sentence_num+"_"+tag;
            if (senttag in temp_this.checked_senttags) {
                d3.select(this).node().checked = temp_this.checked_senttags[senttag];
            } else {
                d3.select(this).node().checked = false;
            }})
          .on("change", function(){
            var sentence_num = d3.select(this.parentNode.parentNode).attr("sentence");
            var tag = d3.select(this.parentNode.parentNode).attr("tag");
            var senttag = sentence_num+"_"+tag;
            temp_this.checked_senttags[senttag] = d3.select(this).node().checked;
            if (temp_this.annotation_element.select("#checkbox_"+sentence_num+"_"+tag).node()) {
                 temp_this.annotation_element.select("#checkbox_"+sentence_num+"_"+tag).node().checked = temp_this.checked_senttags[senttag];}
            if (temp_this.annotation_element.select("#checkbox_"+tag+"_"+sentence_num).node()) {
                 temp_this.annotation_element.select("#checkbox_"+tag+"_"+sentence_num).node().checked = temp_this.checked_senttags[senttag];}
            });
        checkbox_container.append("label")
          .attr("class", "custom-control-label")
          .attr("for", function(d) { return "checkbox_"+d[0]+"_"+d[1]; });
    }
    chooseTag() {
        var tag_selector = this.annotation_element.select("#tag");
        var tag = tag_selector.node().options[tag_selector.node().selectedIndex].value;
        var temp_this = this;
        this.selectTag(tag_selector, "htag");
        if (!(tag in this.cached_results) && tag != "default") {
            this.queryReports();
        } else {
            this.displayTag();
            this.switchToTagSentences();
        }
    }
    chooseHTag(tag_selector) {
        var tag = tag_selector.node().options[tag_selector.node().selectedIndex].value;
        var temp_this = this;
        if (this.selectHTag(tag_selector, "tag")) { return; }
        if (!(tag in this.cached_results) && tag != "default") {
            this.queryReports();
        } else {
            this.displayTag();
            this.switchToTagSentences();
        }
    }
    queryReports() {
        var tag_selector = this.annotation_element.select("#tag");
        var tag = tag_selector.node().options[tag_selector.node().selectedIndex].value;
        var is_nl = tag == 'custom';
        var url = 'http://localhost:5000/query';
        var formData = new FormData();
        formData.append("is_nl", is_nl);
        formData.append("index", this.annotation_element.datum()[4]);
        formData.append("model", this.annotation_element.datum()[0]);
        if (is_nl) {
            addCustomTag(tag_selector.select("#tag_option_"+tag_idxs["custom"]).attr("description"));
            tag_selector.node().selectedIndex = tag_selector.select("#tag_option_"+tag_idxs["custom"+custom_tags.length]).attr("index");
            tag = "custom"+custom_tags.length;
            formData.append("query", tag_selector.select("#tag_option_"+tag_idxs[tag]).attr("description"));
        } else {
            formData.append("query", tag);
        }
        this.cached_results[tag] = null;
        if (!file_from_server) {
            var x = this.annotation_element.select("#reports_file").node();
            formData.append("reports", x.files[0]);
        }
        displayLoader(d3.select("#loader_div"));
        var temp_this = this;
        $.post({
            url: url,
            data: formData,
            success: function(result, status){
                temp_this.cached_results[tag] = result;
                temp_this.tagAllSentences(tag);
                temp_this.displayTag();
                temp_this.switchToTagSentences();
                closeLoader(d3.select("#loader_div"));
            },
            processData: false,
            contentType: false,
        });
    }
    arrSum(arr) {
        return arr.reduce((a,b) => a + b, 0);
    }
    tagAllSentences(tag) {
        var temp_this = this;
        this.cached_results[tag].extracted[this.heatmap].forEach(function(i) { temp_this.tagSentence(i, tag, false); });
        this.refreshSummary();
    }
    displayModelAnnotations() {
        var tag_selector = this.annotation_element.select("#tag").node();
        var tag = tag_selector.options[tag_selector.selectedIndex].value;
        var temp_this = this;
        this.annotation_element.selectAll(".reports_sentence")
          .style("background-color", function(){
            if (tag == 'default') { return "white"; }
            var sentence_num = d3.select(this).attr("sentence");
            if (sentence_num > temp_this.cached_results[tag].heatmaps[temp_this.heatmap].length-1) { return "lightgrey"; }
            var sentence_attention = temp_this.cached_results[tag].heatmaps[temp_this.heatmap][sentence_num];
            return toColor(temp_this.arrSum(sentence_attention), greenhue); })
          .classed("selected", function() { return d3.select(this).attr("sentence") in temp_this.sentence_tags; })
    }
    displayTag() {
        super.displayTag();
        this.displayModelAnnotations();
    }
    sortNumber(a, b) {
        var tag_selector = this.annotation_element.select("#tag").node();
        var tag = tag_selector.options[tag_selector.selectedIndex].value;
        return this.arrSum(this.cached_results[tag].heatmaps[this.heatmap][b]) - this.arrSum(this.cached_results[tag].heatmaps[this.heatmap][a]);
    }
}

// Note: taken from https://github.com/abisee/attn_vis/blob/master/index.html
greenhue = 151
yellowhue = 56
function toColor(p, hue) {
    // converts a scalar value p in [0,1] to a HSL color code string with base color hue
    if (p<0 || p>1) {
      throw sprintf("Error: p has value %.2f but should be in [0,1]", p)
    }
    var saturation = 100; // saturation percentage
    p = 1-p; // invert so p=0 is light and p=1 is dark
    var min_lightness = 50; // minimum percentage lightness, i.e. darkest possible color
    var lightness = (min_lightness + p*(100-min_lightness)); // lightness is proportional to p
    return sprintf('hsl(%d,%s%%,%s%%)', hue, saturation, lightness);
}

function updateProgressBar(progress_bar, new_value) {
    var percentage = new_value*100/progress_bar.attr("aria-valuemax");
    progress_bar.style("width", percentage+"%")
      .attr("aria-valuenow", new_value)
      .html(new_value+" / "+progress_bar.attr("aria-valuemax"));
}

function getTagString(d) {
    if (descriptions[d] != "") {
        return d + ": " + descriptions[d];
    } else {
        return d;
    }
}

function displayTokenizedSentence(d, i) {
    d3.select(this).html("");
    var word = d;
    if (i > 0 && !word.startsWith('##')) {
        d3.select(this).append("text").html(' ');
    } else {
        if (word.startsWith('##')) {
            word = word.slice(2);
        }
    }
    d3.select(this).append("text")
      .style("display", "inline")
      .html(word);
}
