class AnnotateState {
    constructor(annotation_element) {
        this.annotation_element = annotation_element;
        this.addOnClicks();
        this.tag_sentences = {};
        this.sentence_tags = {};
        this.switchToTagSentences();
        this.descriptions = JSON.parse(JSON.stringify(queries));
        this.tags = Object.keys(this.descriptions);
        this.num_custom = 0;
        this.populateTagSelector(this.annotation_element.select("#tag"));
        this.selected_sentence = null;
        this.report_selected_sentences = {};
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
        this.boldTags();
        this.boldReports();
    }
    untagSentence(i, tag) {
        this.annotation_element.select("#summary_sentence_"+tag+"_"+i).remove();
        this.sentence_tags[i].delete(tag);
        if (this.sentence_tags[i].size == 0) {
            this.annotation_element.select("#sentence_"+i).classed("selected", false);
            this.annotation_element.select("#sentence_"+i+"_tags").remove();
            delete this.sentence_tags[i];
        }
        this.tag_sentences[tag].delete(i);
        if (this.tag_sentences[tag].size == 0) {
            this.annotation_element.select("#tag_"+tag).remove();
            delete this.tag_sentences[tag];
        }
        var report = this.annotation_element.select("#sentence_"+i).attr("report_id");
        this.report_selected_sentences[report].delete(i+"_"+tag);
        if (this.report_selected_sentences[report].size == 0) {
            delete this.report_selected_sentences[report];
        }
        this.boldTags();
        this.boldReports();
    }
    populateTagSelector(tag_selector, default_option="Select a Tag", disabled=new Set([])) {
        tag_selector.html("");
        tag_selector.append("option")
          .attr("value", "default")
          .html(default_option)
          .attr("disabled", true);
        tag_selector.append("option")
          .attr("value", "custom")
          .attr("description", "")
          .attr("index", 1)
          .attr("id", tag_selector.attr("id")+"_option_custom")
          .html("Add a Custom Tag: \"\"");
        var temp_descriptions = this.descriptions
        tag_selector.selectAll(".tags")
          .data(this.tags)
          .enter()
          .append("option")
            .attr("value", function(d) { return d; })
            .attr("description", function(d) { return temp_descriptions[d]; })
            .attr("index", function(d, i) { return i+2; })
            .attr("id", function(d) { return tag_selector.attr("id")+"_option_"+d; })
            .html(function(d) { return d + ": " + temp_descriptions[d]; });
        $("#"+tag_selector.attr("id"), this.annotation_element.node()).selectpicker('refresh');
        var temp_this = this;
        $("#"+tag_selector.attr("id")+" ~ div.dropdown-menu:first > div.bs-searchbox > input", this.annotation_element.node()).on("input", function() {
          var text = $(this).val();
          if (text != tag_selector.select("#"+tag_selector.attr("id")+"_option_custom").attr("description")) {
              tag_selector.select("#"+tag_selector.attr("id")+"_option_custom")
                .attr("description", text)
                .html("Add a Custom Tag: \""+text+"\"");
              $("#"+tag_selector.attr("id"), temp_this.annotation_element.node()).selectpicker('refresh');
              $(this).trigger("input");
          }});
    }
    addCustomTag(description) {
        this.num_custom = this.num_custom + 1;
        var tagname = 'custom'+this.num_custom;
        if (tagname in this.descriptions) { alert("error! server bug: no query can be named "+tagname) }
        this.tags.unshift(tagname);
        this.descriptions[tagname] = description
        this.populateTagSelector(this.annotation_element.select("#tag"));
        this.populateTagSelector(this.annotation_element.select("#sentence_tag"), "Add a Tag to this Sentence");
    }
    populateReportSelector() {
        this.annotation_element.select("#report")
          .selectAll("option")
          .data(current_result.original_reports)
          .enter()
          .append("option")
            .attr("value", function(d) { return d[0]; })
            .html(function(d) { return d[0]+'. '+d[1]+', '+d[2]; })
        $("#report", this.annotation_element.node()).selectpicker('refresh');
    }
    makeReports() {
        var reports_text_div = this.annotation_element.select("#reports_div").select(".custom_text");
        reports_text_div.html("");
        var report_p = reports_text_div.selectAll("p")
          .data(current_result.sentence_spans)
          .enter()
          .append("p")
            .attr("class", "report_p");
        console.log(current_result.sentence_spans);
        var divs_for_sentence_and_in_between = report_p.selectAll("div")
          .data(function(d, i) { return d.map(function(e){ return [i, e]; }); })
          .enter()
          .append("div")
            .style("display", "inline");

        // Add anything in orginal report before the sentence
        divs_for_sentence_and_in_between
          .append("text")
            .html(function(d, i) {
              if (i == 0) {
                  var start = 0;
              } else {
                  var start = current_result.sentence_spans[d[0]][i-1][2];
              }
              var end = d[1][1];
              return current_result.original_reports[d[0]][3].slice(start, end); });

        // Add the sentence
        var temp_this = this;
        divs_for_sentence_and_in_between
          .append("text")
            .attr("id", function(d) { return "sentence_"+d[1][0]; })
            .attr("sentence", function(d) { return d[1][0]; })
            .attr("selected", "false")
            .attr("class", "reports_sentence")
            .attr("report_id", function(d) { return d[0]; })
            .on("click", function() { temp_this.selectSentence(d3.select(this)); })
            .html(function(d) {
              return current_result.original_reports[d[0]][3].slice(d[1][1], d[1][2]); });

        // Add anything in original report after the last sentence
        report_p.append("div")
          .append("text")
          .html(function(d, i) {
            var start = current_result.sentence_spans[i][current_result.sentence_spans[i].length-1][2];
            var end = current_result.original_reports[i][3].length;
            return current_result.original_reports[i][3].slice(start, end); });
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
        this.annotation_element.select("#previous").classed("disabled", this.annotation_element.select("#report").node().selectedIndex == 0);
        this.annotation_element.select("#next").classed("disabled", this.annotation_element.select("#report").node().selectedIndex == current_result.original_reports.length-1);
        $("#report", this.annotation_element.node()).selectpicker('refresh');
    }
    displaySentenceTags(i) {
        var sentence_tags = this.annotation_element.select("#sentence_tags");
        var sentence_header = sentence_tags.select("#sentenceheader").selectAll("div").data(current_result.tokenized_text[i]);
        sentence_header.exit().remove();
        sentence_header.enter().append("div").style("display", "inline").each(this.displayTokenizedSentence);
        sentence_header.each(this.displayTokenizedSentence);
        var sentence_tags_list = sentence_tags.select(".custom_text").select("ul").html("");
        var temp_this = this;
        sentence_tags_list.selectAll("li")
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
            .attr("sentence", function(d) { return d[0]; })
            .html(function(d) { return d[1] + ": " + temp_this.descriptions[d[1]]; })
            .on("click", function() {
              var tag = d3.select(this).attr("tag");
              temp_this.annotation_element.select("#tag").node().selectedIndex = temp_this.annotation_element.select("#tag_option_"+tag).attr("index");
              temp_this.displayTag(); });
        this.populateTagSelector(this.annotation_element.select("#sentence_tag"), "Add a Tag to this Sentence");
    }
    displayTokenizedSentence(d, i) {
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
    displayTokenizedSummary() {
        var temp_this = this;
        var tag_sentences_div = this.annotation_element.select("#tag_sentences");
        tag_sentences_div.html("");
        var summary_p = tag_sentences_div.selectAll("p")
          .data(Object.keys(this.tag_sentences))
          .enter()
          .append("p")
            .attr("class", "summary_p")
            .attr("tag", function(d) { return d; })
            .attr("id", function(d) { return "tag_"+d; });
        summary_p.append("p")
          .attr("class", "tagheader")
          .html(function(d) { return d + ": " + temp_this.descriptions[d]; });
        var sentence_p = summary_p.selectAll(".summary_sentence")
          .data(function(d) { return Array.from(temp_this.tag_sentences[d]).sort(temp_this.sortNumber).map(function(e){ return [d, e]; }); })
          .enter()
          .append("p")
            .attr("class", "summary_sentence")
            .attr("id", function(d) { return "summary_sentence_"+d[0]+"_"+d[1]; })
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
          .data(function(d) { return current_result.tokenized_text[d[1]]; })
          .enter()
          .append("div")
            .style("display", "inline")
            .each(temp_this.displayTokenizedSentence);
        this.addAnnotationButton(sentence_p);
        this.displayTag();
    }
    addAnnotationButton(sentence_p) {
        var temp_this = this;
        sentence_p.append("button")
          .attr("class", "btn btn-outline-danger btn-sm")
          .on("click", function(){
            var sentence_num = d3.select(this.parentNode).attr("sentence");
            var tag = d3.select(this.parentNode).attr("tag");
            temp_this.untagSentence(sentence_num, tag); })
          .html("<span aria-hidden=\"true\">&times;</span>");
    }
    displayTag() {
        this.switchToTagSentences();
        var tag_selector = this.annotation_element.select("#tag").node();
        var tag = tag_selector.options[tag_selector.selectedIndex].value;
        if (tag == "custom") {
            this.addCustomTag(this.annotation_element.select("#tag_option_custom").attr("description"));
            tag_selector.selectedIndex = this.annotation_element.select("#tag_option_custom"+this.num_custom).attr("index");
            tag = "custom"+this.num_custom;
        }
        this.annotation_element.selectAll(".summary_p")
          .classed("selected", function() { return d3.select(this).attr("tag") == tag; });
        $("#tag", this.annotation_element.node()).selectpicker('refresh');
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
    chooseReport() {
        var report = this.annotation_element.select("#report").node().selectedIndex;
        this.annotation_element.select("#reports_div").select(".custom_text").selectAll(".report_p")
          .classed("selected", function(d, i) { return i == report; });
        this.annotation_element.select("#previous").classed("disabled", this.annotation_element.select("#report").node().selectedIndex == 0);
        this.annotation_element.select("#next").classed("disabled", this.annotation_element.select("#report").node().selectedIndex == current_result.original_reports.length-1);
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
    addSentenceTag() {
        var tag_selector = this.annotation_element.select("#sentence_tag").node();
        var tag = tag_selector.options[tag_selector.selectedIndex].value;
        if (tag == "custom") {
            this.addCustomTag(this.annotation_element.select("#sentence_tag_option_custom").attr("description"));
            tag = "custom"+this.num_custom;
        }
        this.tagSentence(this.selected_sentence, tag);
        this.displaySentenceTags(this.selected_sentence);
        this.switchToSentenceTags();
    }
    showAllSummaries() {
        this.switchToTagSentences();
        this.annotation_element.select("#summary_div").select(".custom_text").selectAll(".summary_p")
          .classed("selected", true);
        this.annotation_element.select("#tag").node().selectedIndex = 0;
        $("#tag", this.annotation_element.node()).selectpicker('refresh');
    }
    addOnClicks() {
        var temp_this = this;
        this.annotation_element.select("#previous").on("click", function(){ temp_this.previousReport(); })
        this.annotation_element.select("#report").on("change", function(){ temp_this.chooseReport(); })
        this.annotation_element.select("#next").on("click", function(){ temp_this.nextReport(); })
        this.annotation_element.select("#tag").on("change", function(){ temp_this.displayTag(); });
        this.annotation_element.select("#show_all").on("click", function(){ temp_this.showAllSummaries(); });
        this.annotation_element.select("#sentence_tag").on("change", function(){ temp_this.addSentenceTag(); })
    }
}


class ValidateState extends AnnotateState {
    constructor(validation_element) {
        this.heatmap = "sentence_level_attention";
        this.cached_results = {};
        super(validation_element);
    }
    selectSentence(sentence_text) {
        this.showAllSummaries();
        this.selected_sentence = sentence_text.attr("sentence");
        this.switchToSentenceTags();
        this.displaySentenceTags(sentence_text.attr("sentence"));
    }
    addAnnotationButton(sentence_p) {
        var checkbox_container = sentence_p.append("div")
          .attr("class", "custom-control custom-checkbox form-control-lg");
        checkbox_container.append("input")
          .attr("type", "checkbox")
          .attr("class", "custom-control-input")
          .attr("id", function(d) { return "checkbox_"+d[0]+"_"+d[1]; });
        checkbox_container.append("label")
          .attr("class", "custom-control-label")
          .attr("for", function(d) { return "checkbox_"+d[0]+"_"+d[1]; });
    }
    chooseTag() {
        var url = 'http://localhost:5000/query';
        var formData = new FormData();
        var tag_selector = this.annotation_element.select("#tag").node();
        var tag = tag_selector.options[tag_selector.selectedIndex].value;
        var is_nl = tag == 'custom';
        formData.append("is_nl", is_nl);
        if (is_nl) {
            this.addCustomTag(this.annotation_element.select("#tag_option_custom").attr("description"));
            tag_selector.selectedIndex = this.annotation_element.select("#tag_option_custom"+state.num_custom).attr("index");
            tag = "custom"+this.num_custom;
            formData.append("query", this.annotation_element.select("#tag_option_"+tag).attr("description"));
        } else {
            formData.append("query", tag);
        }
        if (!(tag in this.cached_results)) {
            if (!file_from_server) {
                var x = this.annotation_element.select("#reports_file").node();
                formData.append("reports", x.files[0]);
            }
            displayLoader(d3.select("#loader_div"));
            temp_this = this;
            $.post({
                url: url,
                data: formData,
                success: function(result, status){
                    temp_this.cached_results[tag] = result;
                    temp_this.tagAllSentences();
                    temp_this.displayTag();
                    closeLoader(d3.select("#loader_div"));
                },
                processData: false,
                contentType: false,
            });
        } else {
            this.displayTag();
        }
    }
    arrSum(arr) {
        return arr.reduce((a,b) => a + b, 0);
    }
    
}
