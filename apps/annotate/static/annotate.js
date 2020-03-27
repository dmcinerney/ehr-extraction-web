class State {
    constructor(annotation_element, trained_queries, with_custom, is_future) {
        this.annotation_element = annotation_element;
        this.tags = Object.keys(hierarchy["descriptions"]);
        this.trained_queries = trained_queries;
        this.with_custom = with_custom;
        this.is_future = is_future;
        this.tag_sentences = {};
        this.sentence_tags = {};
        this.selected_sentence = null;
        this.report_selected_sentences = {};
        this.current_result = null;
        this.addOnClicks();
        this.htags = {};
        this.annotation_element.select("#htag0").attr("parent", hierarchy["start"]);
    }
    setAnnotations(annotations, refresh=true) {
        var temp_this = this;
        Object.keys(annotations.tag_sentences).forEach(function(t){
            Array.from(annotations.tag_sentences[t]).forEach(function(i){
                temp_this.tagSentence(i, t, false, true);
            });
        });
        if (refresh) {
            this.refreshSummary();
        }
    }
    getAnnotations() {
        var tag_sentences = {};
        var temp_this = this;
        Array.from(Object.keys(this.tag_sentences)).forEach(function(e){
            tag_sentences[e] = Array.from(temp_this.tag_sentences[e]);
        });
        return {'tag_sentences':tag_sentences};
    }
    initWithResult(current_result) {
        this.current_result = current_result;
        this.populateReportSelector();
        this.makeReports();
        this.chooseReport();
        this.refreshTagSelectors();
    }
    closeSentenceTagsModal(){
        $(this.annotation_element.select("#sentence_tags_modal").node()).modal('hide');
    }
    openSentenceTagsModal(){
        $(this.annotation_element.select("#sentence_tags_modal").node()).modal('show');
    }
    tagSentence(i, tag, refresh=true, ignore_if_tagged=false){
        if (tag == 'default') {
            this.selected_sentence = i;
            this.openSentenceTagsModal();
            this.displaySentenceTags(i);
        } else {
            if (this.tag_sentences[tag] != null && this.tag_sentences[tag].has(i)) {
                //alert("tag already present for this sentence");
                if (!ignore_if_tagged) {
                    this.selected_sentence = i;
                    this.openSentenceTagsModal();
                    this.displaySentenceTags(i);
                }
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
        if (this.is_future) {
            updateFutureTags();
        }
        this.displayTagSentences();
        if (this.selected_sentence) { this.displaySentenceTags(this.selected_sentence); }
        this.refreshTagSelectorsStyle();
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
    removeAllTagSentences(tag) {
        if (tag in this.tag_sentences) {
            var temp_this = this;
            Array.from(this.tag_sentences[tag]).forEach(function(e){ temp_this.untagSentence(e, tag, false); });
            this.refreshSummary();
        }
    }
    removeAllSentenceTags(sentence) {
        if (sentence in this.sentence_tags) {
            var temp_this = this;
            Array.from(this.sentence_tags[sentence]).forEach(function(e){ temp_this.untagSentence(sentence, e, false); });
            this.refreshSummary();
        }
    }
    refreshTagSelectorsStyle() {
        var temp_this = this;
        var refresh_func = function(){ temp_this.styleTags(d3.select(this)); };
        this.annotation_element.selectAll(".selectpicker.tag_selector").each(refresh_func);
        this.annotation_element.selectAll(".selectpicker.htag_selector").each(refresh_func);
    }
    refreshTagSelectors() {
        var temp_this = this;
        var refresh_func = function(){ temp_this.refreshTagSelector(d3.select(this)); };
        this.annotation_element.selectAll(".selectpicker.tag_selector").each(refresh_func);
        this.annotation_element.selectAll(".selectpicker.htag_selector").each(refresh_func);
    }
    refreshTagSelector(tag_selector) {
        var selected_index = tag_selector.node().selectedIndex;
        if (selected_index != -1) {
            var tag = tag_selector.node().options[selected_index].value;
        }

        if (this.is_future) {
            var interesting_tag_group = ["Positive Tags", positive_targets];
        } else {
            var interesting_tag_group = ["Future Tags", future_tags];
        }
        var tag_groups = [interesting_tag_group[0], "Custom Tags", "Other Tags"];
        var interesting_tag_set = new Set(interesting_tag_group[1]);
        var custom_tag_set = new Set(custom_tags);
        if (this.with_custom) {
            var disabled_set = new Set([]);
        } else {
            var disabled_set = custom_tag_set;
        }
        if (tag_selector.classed("htag_selector")) {
            var options = hierarchy["options"][tag_selector.attr("parent")];
            var custom_tag_group = options.filter(function(e){ return custom_tag_set.has(e) && !(interesting_tag_set.has(e)); });
            var other_tag_group_not_disabled = options.filter(function(e){ return !(interesting_tag_set.has(e)) && !(custom_tag_set.has(e)) && !(disabled_set.has(e)); });
            var other_tag_group_disabled = options.filter(function(e){ return !(interesting_tag_set.has(e)) && !(custom_tag_set.has(e)) && disabled_set.has(e); });
            var tags = {
                "Custom Tags": custom_tag_group,
                "Other Tags" : other_tag_group_not_disabled.concat(other_tag_group_disabled)
            };
            tags[interesting_tag_group[0]] = options.filter(function(e){ return interesting_tag_set.has(e); });
            this.populateHTagSelector(tag_selector, tag_groups, tags, disabled_set);
        } else {
            var custom_tag_group = custom_tags.filter(function(e){ return !(interesting_tag_set.has(e)); });
            var other_tag_group_not_disabled = this.tags.filter(function(e){ return !(interesting_tag_set.has(e)) && !(custom_tag_set.has(e)) && !(disabled_set.has(e)); })
            var other_tag_group_disabled = Array.from(disabled_set).filter(function(e){ return !(interesting_tag_set.has(e)) && !(custom_tag_set.has(e)); })
            var tags = {
                "Custom Tags": custom_tag_group,
                "Other Tags" : other_tag_group_not_disabled.concat(other_tag_group_disabled)
            };
            tags[interesting_tag_group[0]] = Array.from(interesting_tag_group[1]);
            this.populateTagSelector(tag_selector, tag_groups, tags, disabled_set);
        }
        this.styleTags(tag_selector);
        if (selected_index != -1) {
            tag_selector.node().selectedIndex = tag_selector.select("#"+tag_selector.attr("id")+"_option_"+tag_idxs[tag]).attr("index");
            $(tag_selector.node()).selectpicker('refresh');
        }
    }
    populateHTagSelector(tag_selector, tag_groups, tags, disabled=new Set([])) {
        var option_values = this.populateTagSelector(tag_selector, tag_groups, tags, disabled);
//        $(tag_selector).on("hidden.bs.select", function(){ $(this).trigger("changed.bs.select"); });
        if (!(tag_selector.attr("base_id") in this.htags)) {
            this.htags[tag_selector.attr("base_id")] = [];
        }
        if (this.htags[tag_selector.attr("base_id")].length <= Number(tag_selector.attr("num"))) {
            this.htags[tag_selector.attr("base_id")].push(tag_selector);
        }
        var temp_this = this;
        tag_selector.attr("selecting_children", "false");
        $(tag_selector.node()).on("shown.bs.select", function(){
          d3.select("div.dropdown-menu.show").selectAll("li").filter(function(){
            return !(d3.select(this).classed("dropdown-divider") || d3.select(this).classed("dropdown-header")); })
            .each(function(d, i){
              d3.select(this).classed("disabled", false)
                .select("a").on("click", function(){ if(tag_selector.node().selectedIndex == i){tag_selector.on("change").bind(tag_selector.node())();} });
              var value = option_values[i];
              if (!(value in hierarchy["options"])){ return; }
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
                          return (parseInt(window.getComputedStyle(d3.select(this).node(), null).getPropertyValue('padding-right'))+30)+"px"; }); })
                    .on("click", function(){
                      tag_selector.node().selectedIndex = i;
                      $(tag_selector.node()).selectpicker('refresh');
                      tag_selector.attr("selecting_children", "true");
                      tag_selector.on("change").bind(tag_selector.node())(); });
            });
          });
    }
    populateTagSelector(tag_selector, tag_groups, tags, disabled=new Set([])) {
        //$(tag_selector.node()).on("show.bs.select", function(){console.log("show.bs.select");});
        //$(tag_selector.node()).on("shown.bs.select", function(){console.log("shown.bs.select");});
        //$(tag_selector.node()).on("hide.bs.select", function(){console.log("hide.bs.select");});
        //$(tag_selector.node()).on("hidden.bs.select", function(){console.log("hidden.bs.select");});
        //$(tag_selector.node()).on("loaded.bs.select", function(){console.log("loaded.bs.select");});
        //$(tag_selector.node()).on("rendered.bs.select", function(){console.log("rendered.bs.select");});
        //$(tag_selector.node()).on("refreshed.bs.select", function(){console.log("refreshed.bs.select");});
        //$(tag_selector.node()).on("changed.bs.select", function(){console.log("changed.bs.select");});
        tag_selector.html("");
        var option_values = [];
        tag_selector.append("option")
          .attr("value", "default")
          .attr("index", 0)
          .attr("id", tag_selector.attr("id")+"_option_"+tag_idxs["default"])
          .html(tag_selector.attr("default"))
          .attr("disabled", true);
        option_values.push("default")
        if (this.with_custom) {
            tag_selector.append("option")
              .attr("value", "custom")
              .attr("description", "")
              .attr("index", 1)
              .attr("id", tag_selector.attr("id")+"_option_"+tag_idxs["custom"])
              .html("Add a Custom Tag: \"\"");
            option_values.push("custom")
        }
        var temp_this = this;
        tag_groups = tag_groups.filter(function(e){ return tags[e].length > 0; });
        if (tag_groups.length != 1) {
            var optgroup = tag_selector.selectAll("optgroup")
              .data(tag_groups)
              .enter()
              .append("optgroup")
                .attr("label", function(d){ return d; })
                .selectAll("option")
                .data(function(d){ return tags[d]; });
        } else {
            var optgroup = tag_selector.selectAll(".tags")
              .data(tags[tag_groups[0]]);
        }
        optgroup
          .enter()
          .append("option")
          .attr("value", function(d) { return d; })
          .attr("description", function(d) { return hierarchy["descriptions"][d]; })
          .attr("index", function(d) {
            option_values.push(d);
            return option_values.length-1; })
          .attr("id", function(d) { return tag_selector.attr("id")+"_option_"+tag_idxs[d]; })
          .each(function(d){
            if (disabled.has(d)) { d3.select(this).attr("disabled", "true"); }; })
          .html(getTagString);
        $(tag_selector.node()).selectpicker('refresh');
        //$(tag_selector.node()).on('loaded.bs.select', function(){$(tag_selector.node()).selectpicker('refresh');});
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
        return option_values;
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
            .style("color", "#b5b5b5")
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
            .on("click", function() { temp_this.selectSentence(d3.select(this)); })
            .html(function(d) {
              var raw_text = temp_this.current_result.original_reports[d[0]][3].slice(d[1][1], d[1][2]);
              return raw_text.replace(/\n/g, "<br />"); });

        // Add anything in original report after the last sentence
        report_p.append("div")
          .append("text")
            .style("color", "#b5b5b5")
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
        var sentence_header = this.annotation_element.select("#sentenceheader").selectAll("div").data(this.current_result.tokenized_text[i]);
        sentence_header.exit().remove();
        sentence_header.enter().append("div").style("display", "inline").each(displayTokenizedSentence);
        sentence_header.each(displayTokenizedSentence);
        var sentence_tags_list = sentence_tags.select("ul").html("");
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
            $(temp_this.annotation_element.select("#tag").node()).selectpicker('refresh');
            temp_this.chooseTag();
            temp_this.closeSentenceTagsModal();
            var sentence_num = d3.select(this.parentNode).attr("sentence");
            var sentence = temp_this.annotation_element.select("#summary_sentence_"+tag_idxs[tag]+"_"+sentence_num);
            sentence.node().scrollIntoView({block: "center"});
            temp_this.highlightMomentarily(sentence); });
        this.addAnnotationButton(list_item);
    }
    displayTagSentences() {
        var temp_this = this;
        var tag_sentences_div = this.annotation_element.select("#tag_sentences").select(".custom_text");
        tag_sentences_div.html("");
        var summary_div = tag_sentences_div.append("div")
          .attr("id", temp_this.annotation_element.attr("id")+"_tag_sentences_accordian")
          .selectAll("div.card")
          .data(Object.keys(this.tag_sentences))
          .enter()
          .append("div")
            .attr("class", "card summary_div")
            .attr("tag", function(d) { return d; })
            .attr("id", function(d) { return "t_"+tag_idxs[d]; });
        var summary_header = summary_div.append("div")
          .attr("class", "card-header")
          .attr("id", function(d){ return temp_this.annotation_element.attr("id")+"_t_"+tag_idxs[d]+"_header"; })
        summary_header.append("h2")
          .attr("class", "mb-0")
          .append("button")
            .attr("class", "btn btn-link")
            .attr("type", "button")
            .attr("data-toggle", "collapse")
            .attr("data-target", function(d){ return "#"+temp_this.annotation_element.attr("id")+"_t_"+tag_idxs[d]+"_body"; })
            .attr("aria-expanded", function(d){
                 var tag_selector = temp_this.annotation_element.select("#tag").node();
                 var tag = tag_selector.options[tag_selector.selectedIndex].value;
                 return d == tag; })
            .attr("aria-controls", function(d){ return temp_this.annotation_element.attr("id")+"_t_"+tag_idxs[d]+"_body"; })
            .on("click", function(){
                if (!(d3.select(this.parentNode.parentNode.parentNode).select("div.collapse").classed("show"))) {
                    var tag = d3.select(this.parentNode.parentNode.parentNode).attr("tag");
                    temp_this.annotation_element.select("#tag").node().selectedIndex = temp_this.annotation_element.select("#tag_option_"+tag_idxs[tag]).attr("index");
                    $(temp_this.annotation_element.select("#tag").node()).selectpicker('refresh');
                    temp_this.chooseTag();
                } else {
                    temp_this.deselect();
                }
            })
            .append("text")
              .attr("class", "tagheader")
              .html(getTagString);
        summary_header.append("button")
          .attr("type", "button")
          .attr("class", "close")
          .on("click", function(){
              var tag = d3.select(this.parentNode.parentNode).attr("tag");
              temp_this.removeAllTagSentences(tag);
          })
          .html("<span aria-hidden=\"true\">&times;</span>");
        var summary_ul = summary_div.append("div")
          .attr("id", function(d){ return temp_this.annotation_element.attr("id")+"_t_"+tag_idxs[d]+"_body"; })
          .attr("class", "collapse")
          .classed("show", function(d){
              var tag_selector = temp_this.annotation_element.select("#tag").node();
              var tag = tag_selector.options[tag_selector.selectedIndex].value;
              return d == tag; })
          .attr("aria-labelledby", function(d){ return temp_this.annotation_element.attr("id")+"_t_"+tag_idxs[d]+"_header"; })
          .attr("data-parent", "#"+temp_this.annotation_element.attr("id")+"_tag_sentences_accordian")
          .append("ul")
            .attr("class", "card-body")
        var sentence_li = summary_ul.selectAll(".summary_sentence")
          .data(function(d) { return Array.from(temp_this.tag_sentences[d]).sort(function(a,b){return temp_this.sortNumber(a, b, d);}).map(function(e){ return [d, e]; }); })
          .enter()
          .append("li")
            .attr("class", "summary_sentence")
            .attr("id", function(d) { return "summary_sentence_"+tag_idxs[d[0]]+"_"+d[1]; })
            .attr("tag", function(d) { return d[0]; })
            .attr("sentence", function(d) { return d[1]; });
        sentence_li.append("div")
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
        this.addAnnotationButton(sentence_li);
        this.displayTag();
    }
    addAnnotationButton(senttag_container) {
        var temp_this = this;
        senttag_container.append("button")
          .attr("class", "close")
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
                addCustomTag(tag_selector.select("#"+tag_selector.attr("id")+"_option_"+tag_idxs["custom"]).attr("description"));
                tag_selector.node().selectedIndex = tag_selector.select("#"+tag_selector.attr("id")+"_option_"+tag_idxs["custom"+custom_tags.length]).attr("index");
                $(tag_selector.node()).selectpicker('refresh');
                tag = "custom"+custom_tags.length;
            }
            var linearization = linearize(tag);
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
        }
    }
    selectHTag(htag_selector, tag_selector_id) {
        var tag = htag_selector.node().options[htag_selector.node().selectedIndex].value;
        if (tag == "custom") {
            addCustomTag(htag_selector.select("#"+htag_selector.attr("id")+"_option_"+tag_idxs["custom"]).attr("description"), htag_selector.attr("parent"));
            htag_selector.node().selectedIndex = htag_selector.select("#"+htag_selector.attr("id")+"_option_"+tag_idxs["custom"+custom_tags.length]).attr("index");
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
        }
        var tag = tag_selector.node().options[tag_selector.node().selectedIndex].value;
        if (tag in hierarchy["options"]){
            var options = hierarchy["options"][tag];
            var next_tag_selector = d3.select(tag_selector.node().parentNode.parentNode).append("select")
              .attr("class", "selectpicker htag_selector")
              .attr("data-live-search", "true")
              .attr("num", num+1)
              .attr("base_id", base_id)
              .attr("id", base_id+(num+1))
              .attr("parent", tag)
              .attr("default", tag_selector.attr("default"))
              .attr("data-container", tag_selector.attr("data-container"))
              .on("change", tag_selector.on("change"));
            if (open_after) {
                tag_selector.attr("selecting_children", "false");
                $(next_tag_selector.node()).on("loaded.bs.select", function(){
                  $(next_tag_selector.node()).selectpicker('toggle'); });
            }
            this.refreshTagSelector(next_tag_selector);
        }
    }
    displayTag() {
        var tag_selector = this.annotation_element.select("#tag").node();
        var tag = tag_selector.options[tag_selector.selectedIndex].value;
        if (tag == "default") {
            this.annotation_element.selectAll(".summary_div").select("div.collapse.show").each(function(){$(this).collapse('hide');});
        } else {
            var tag_block = this.annotation_element.select("#"+this.annotation_element.attr("id")+"_t_"+tag_idxs[tag]+"_body");
            if (tag_block.node()) {
                tag_block
                  .each(function(){$(this).collapse('show');})
                  .node().scrollIntoView({block: "start"});
            } else {
                this.annotation_element.selectAll(".summary_div").select("div.collapse.show").each(function(){$(this).collapse('hide');});
            }
        }
    }
    sortNumber(a, b, tag) {
        return a - b;
    }
    styleTags(tag_selector, refresh=true) {
        var temp_this = this;
        var bold_tags = new Set(Object.keys(this.tag_sentences).filter(function(e){ return temp_this.tag_sentences[e].size > 0; }));
        tag_selector.selectAll("option").classed("bold_option", function(){
          var tag = d3.select(this).attr("value");
          if (tag == "default") {
              return false;
          } else {
              return bold_tags.has(tag);
          }});
        if (refresh) {
            $(tag_selector.node()).selectpicker('refresh');
        }
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
    deselect() {
        this.annotation_element.select("#tag").node().selectedIndex = 0;
        $(this.annotation_element.select("#tag").node()).selectpicker('refresh');
        this.chooseTag();
    }
    addOnClicks() {
        var temp_this = this;
        this.annotation_element.select("#previous").on("click", function(){ temp_this.previousReport(); });
        this.annotation_element.select("#report").on("change", function(){ temp_this.chooseReport(); });
        this.annotation_element.select("#next").on("click", function(){ temp_this.nextReport(); });
        this.annotation_element.select("#tag").on("change", function(){ temp_this.chooseTag(); });
        this.annotation_element.select("#htag0").on("change", function(){ temp_this.chooseHTag(d3.select(this)); });
        this.annotation_element.select("#deselect").on("click", function(){ temp_this.deselect(); });
    }
}

class AnnotateState extends State{
    constructor(annotation_element, trained_queries, with_custom, is_future) {
        super(annotation_element, trained_queries, with_custom, is_future);
        var temp_this = this;
        var sentence_tag = this.annotation_element.select("#sentence_tags").append("select")
          .attr("class", "selectpicker tag_selector forsentence")
          .attr("data-live-search", "true")
          .attr("id", "sentence_tag")
          .attr("default", "Add a Tag")
          .attr("data-container", "body")
          .on("change", function(){ temp_this.addSentenceTag(); });
        var sentence_htag = this.annotation_element.select("#sentence_tags").append("div")
          .attr("class", "buttons htag_container")
            .append("select")
            .attr("class", "selectpicker htag_selector forsentence")
            .attr("data-live-search", "true")
            .attr("num", 0)
            .attr("base_id", "sentence_htag")
            .attr("id", "sentence_htag0")
            .attr("parent", hierarchy["start"])
            .attr("default", "Add a Tag")
            .attr("data-container", "body")
            .on("change", function(){ temp_this.addSentenceHTag(d3.select(this)); });
        this.annotation_element.select("#sentence_tags_modal")
          .select(".modal-header")
          .append("button")
            .attr("id", "remove_sentence_tags")
            .attr("type", "button")
            .attr("class", "btn btn-danger")
            .html("Remove All")
        this.annotation_element.select("#remove_sentence_tags").on("click", function(){ temp_this.removeAllSentenceTags(temp_this.selected_sentence); });
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
        }
    }
/*    styleTags(tag_selector, refresh=true) {
        if (tag_selector.classed("forsentence") && this.selected_sentence && this.selected_sentence in this.sentence_tags) {
            var temp_this = this;
            tag_selector.selectAll("option")
              .each(function(){
                var tag = d3.select(this).attr("value");
                if (temp_this.sentence_tags[temp_this.selected_sentence].has(tag) || temp_this.disabled.has(tag)) {
                    d3.select(this).attr("disabled", "true");
                } else {
                    d3.select(this).node().removeAttribute("disabled");
                }});
        }
        super.styleTags(tag_selector, refresh);
    } */
    displaySentenceTags(i) {
        super.displaySentenceTags(i);
        this.refreshTagSelectorsStyle();
    }
}


class ValidateState extends State {
    constructor(validation_element, trained_queries, with_custom, is_future) {
        super(validation_element, trained_queries, with_custom, is_future);
        this.heatmap = "sentence_level_attention";
        this.cached_results = {};
        this.checked_senttags = {};
    }
    setAnnotations(annotations, refresh=true) {
        super.setAnnotations(annotations, false);
        this.checked_senttags = annotations.checked_senttags;
        if (refresh) {
            this.refreshSummary();
        }
    }
    getAnnotations() {
        var annotations = super.getAnnotations();
        annotations['checked_senttags'] = this.checked_senttags;
        return annotations;
    }
    selectSentence(sentence_text) {
        this.selected_sentence = sentence_text.attr("sentence");
        this.openSentenceTagsModal();
        this.displaySentenceTags(sentence_text.attr("sentence"));
    }
    addAnnotationButton(senttag_container) {
        var checkbox_container = senttag_container.append("div")
          .attr("class", "custom-control custom-checkbox form-control-lg checkbox");
        var temp_this = this;
        checkbox_container.append("input")
          .attr("type", "checkbox")
          .attr("class", "custom-control-input")
          .attr("id", function() { return "checkbox_"+d3.select(this.parentNode.parentNode).attr("id"); })
          .each(function(){
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
            if (temp_this.annotation_element.select("#checkbox_sentence_tag_"+sentence_num+"_"+tag_idxs[tag]).node()) {
                 temp_this.annotation_element.select("#checkbox_sentence_tag_"+sentence_num+"_"+tag_idxs[tag]).node().checked = temp_this.checked_senttags[senttag];}
            if (temp_this.annotation_element.select("#checkbox_summary_sentence_"+tag_idxs[tag]+"_"+sentence_num).node()) {
                 temp_this.annotation_element.select("#checkbox_summary_sentence_"+tag_idxs[tag]+"_"+sentence_num).node().checked = temp_this.checked_senttags[senttag];}
            });
        checkbox_container.append("label")
          .attr("class", "custom-control-label")
          .attr("for", function(d) { return "checkbox_"+d3.select(this.parentNode.parentNode).attr("id"); });
    }
    chooseTag() {
        var tag_selector = this.annotation_element.select("#tag");
        var tag = tag_selector.node().options[tag_selector.node().selectedIndex].value;
        var temp_this = this;
        this.selectTag(tag_selector, "htag");
        if (!(tag in this.cached_results) && tag != "default") {
            this.queryReports();
        } else {
            if (tag in this.tag_sentences || tag == "default") {
                this.displayTag();
            } else {
                this.tagAllSentences(tag);
            }
        }
    }
    chooseHTag(tag_selector) {
        var tag = tag_selector.node().options[tag_selector.node().selectedIndex].value;
        var temp_this = this;
        if (this.selectHTag(tag_selector, "tag")) { return; }
        if (!(tag in this.cached_results) && tag != "default") {
            this.queryReports();
        } else {
            if (tag in this.tag_sentences || tag == "default") {
                this.displayTag();
            } else {
                this.tagAllSentences(tag);
            }
        }
    }
    queryReports() {
        var tag_selector = this.annotation_element.select("#tag");
        var tag = tag_selector.node().options[tag_selector.node().selectedIndex].value;
        var is_nl = custom_tags.includes(tag);
        var url = '/query';
        var formData = new FormData();
        formData.append("is_nl", is_nl);
        formData.append("index", this.annotation_element.datum()[4]);
        formData.append("model", this.annotation_element.datum()[0]);
        if (is_nl) {
            formData.append("query", tag_selector.select("#tag_option_"+tag_idxs[tag]).attr("description"));
        } else {
            formData.append("query", tag);
        }
        formData.append("tag", tag);
        formData.append("description", get_query_description(tag));
        formData.append("description_linearization", get_query_description_linearization(tag));
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
        this.cached_results[tag].extracted[this.heatmap].forEach(function(i) { temp_this.tagSentence(i, tag, false, true); });
        this.refreshSummary();
    }
    displayModelAnnotations() {
        var tag_selector = this.annotation_element.select("#tag").node();
        var tag = tag_selector.options[tag_selector.selectedIndex].value;
        var temp_this = this;
        this.annotation_element.selectAll(".reports_sentence")
          .style("background-color", function(){
            if ((tag == 'default') || !(tag in temp_this.cached_results)) { return "white"; }
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
    sortNumber(a, b, tag) {
        if (tag in this.cached_results) {
            return this.arrSum(this.cached_results[tag].heatmaps[this.heatmap][b]) - this.arrSum(this.cached_results[tag].heatmaps[this.heatmap][a]);
        } else {
            return 1;
        }
    }
    removeAllTagSentences(tag) {
        super.removeAllTagSentences(tag);
        
    }
}

// Note: taken from https://github.com/abisee/attn_vis/blob/master/index.html
greenhue = 151
yellowhue = 56
function toColor(p, hue) {
    // converts a scalar value p in [0,1] to a HSL color code string with base color hue
    if (p<0 || p>1) {
      //throw sprintf("Error: p has value %.2f but should be in [0,1]", p)
      console.log(sprintf("Error: p has value %f but should be in [0,1]", p));
      p = 0;
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
    if (hierarchy["descriptions"][d] != "") {
        return d + ": " + hierarchy["descriptions"][d];
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

function get_query_description(tag){
    if (hierarchy["descriptions"][tag] == "") {
        return tag;
    } else {
        return hierarchy['descriptions'][tag];
    }
}

function get_query_description_linearization(tag){
    var description_linearization = get_query_description(tag);
    var tag_temp = hierarchy['parents'][tag];
    while (tag_temp in hierarchy['parents']) {
        description_linearization = get_query_description(tag_temp)+" [CLS] "+description_linearization;
        tag_temp = hierarchy['parents'][tag_temp];
    }
    return description_linearization;
}
