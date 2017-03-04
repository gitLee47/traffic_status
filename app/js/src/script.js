(function () {
    function DataFetcher(urlFactory, delay) {
        var self = this;

        self.repeat = false;
        self.delay = delay;
        self.timer = null;
        self.requestObj = null;

        function getNext() {
            self.requestObj = $.ajax({
                    url: urlFactory()
                }).done(function(response) {
                    $(self).trigger("stateFetchingSuccess", {
                        result: response
                    });
                }).fail(function(jqXHR, textStatus, errorThrown) {
                    $(self).trigger("stateFetchingFailure", {
                        error: textStatus
                    });
                }).always(function() {
                    if (self.repeat && _.isNumber(self.delay)) {
                        self.timer = setTimeout(getNext, self.delay);
                    }
                });
        }

        self.start = function(shouldRepeat) {
            self.repeat = shouldRepeat;
            getNext();
        };

        self.stop = function() {
            self.repeat = false;
            clearTimeout(self.timer);
        };

        self.repeatOnce = function() {
            getNext();
        };

        self.setDelay = function(newDelay) {
            this.delay = newDelay;
        };
    }

    var $trafficStatusList = $("#mockTrafficStat"),
        df2 = new DataFetcher(function() {
            return "/traffic_status/frozen";
        });
	var tempData = [];
    $(df2).on({
        "stateFetchingSuccess": function(event, data) {
			data.result.data.forEach(function(dataEntry) {
				//console.log(dataEntry);
                tempData.push(dataEntry);
            });
			createCharts(tempData);
        },
        "stateFetchingFailure": function(event, data) {
			console.log("Loading...");
            setTimeout(function() {
                $trafficStatusList.html("");
                df2.repeatOnce();
            }, 1000);
        }
    });

    df2.start();
})();

var width = 960,
    height = 500;

var color = d3.scale.category20();

var force = d3.layout.force()
	.gravity(.05)
    .distance(200)
    .charge(-100)
    .size([width, height]);

var svg = d3.select(".demoContainer").append("svg")
    .attr("width", width)
    .attr("height", height)
	//.append('svg:g')
		.call(d3.behavior.zoom().on("zoom", redraw))
	.append('svg:g');
	

	
function redraw() {
  //console.log("here", d3.event.translate, d3.event.scale);
  svg.attr("transform","translate(" + d3.event.translate + ")"+ " scale(" + d3.event.scale + ")");
}
	
//implementing pinning
var node_drag = d3.behavior.drag()
        .on("dragstart", dragstart)
        .on("drag", dragmove)
        .on("dragend", dragend);
    function dragstart(d, i) {
		d3.event.sourceEvent.stopPropagation();
        force.stop() // stops the force auto positioning before you start dragging
    }
    function dragmove(d, i) {
        d.px += d3.event.dx;
        d.py += d3.event.dy;
        d.x += d3.event.dx;
        d.y += d3.event.dy;
    }
    function dragend(d, i) {
        d.fixed = true; // of course set the node to fixed so the force doesn't include the node in its auto positioning stuff
        force.resume();
    }
    function releasenode(d) {
        d.fixed = false; // of course set the node to fixed so the force doesn't include the node in its auto positioning stuff
        //force.resume();
    }	
//Starting Code for building graph
function createCharts(tdata) {
	var links = tdata;
	
	var nodesByName = {};
	var linkedByIndex = {};
	
	links.forEach(function(link) {
		if(link.srcObj != null || link.destObj != null) {
			link.source = nodeByName(link.srcObj,link.srcType);
			link.target = nodeByName(link.destObj,link.destType);
			linkedByIndex[link.srcObj + "," + link.destObj] = 1;
		}
	});
	
	function neighboring(a, b){
		return linkedByIndex[a.name + "," + b.name] || linkedByIndex[b.name + "," + a.name];
	}
	
	var nodes = d3.values(nodesByName);
	
	//Creating a hashmap helper
	function nodeByName(name, group) {
		return nodesByName[name] || (nodesByName[name] = {name: name, group: group});
	}
	
	// Per-type markers, as they don't inherit styles.
	var marker = svg.append("defs").selectAll("marker")
				.data(["end"])
			.enter().append("marker")
				.attr("id", function(d) { return d; })
				.attr("viewBox", "0 -5 10 10")
				.attr("refX", 25)
				.attr("refY", 0)
				.attr("markerWidth", 6)
				.attr("markerHeight", 6)
				.attr("orient", "auto")
			.append("path")
				.attr("d", "M0,-5L10,0L0,5 L10,0 L0, -5")
				.style("stroke", "#4679BD")
				.style("opacity", "0.6");
	
	// Create the link lines.
	var link = svg.selectAll(".link")
			.data(links)
		.enter().append("line")
			.attr("class", "link")
			.attr("stroke", "#ddd")
			.attr("stroke-opacity", 0.8)
			.attr("marker-end", "url(#end)");
	
	var label = svg.selectAll('text')
			.data(links)
		  .enter().append('text')
			//.attr("x", function(d) { return (d.source.y + d.target.y) / 2; }) 
			//.attr("y", function(d) { return (d.source.x + d.target.x) / 2; }) 
			.attr("text-anchor", "middle") 
			.attr("fill-opacity",0)
			.text(function(d) {return d.traffic;}); 	
			
	// Create the node circles.
	var node = svg.selectAll(".node")
      .data(nodes)
    .enter().append("circle")
      .attr("class", "node")
      .attr("r", 10)
	  .style("fill", function(d) { return color(d.group); })
	  .style("stroke", "#ddd")
	  .style("stroke-width", 1.0)
      .on('click', releasenode)
	  .call(node_drag);
	  
	node.append("title")
      .text( function(d) { return d.name;});
	  
	node.on("mouseover", showDetails)
        .on("mouseout", hideDetails)
	  
	// Start the force layout.
	force
      .nodes(nodes)
      .links(links)
      .on("tick", tick)
      .start();

	function tick() {
		
		link.attr("x1", function(d) { return d.source.x; })
			.attr("y1", function(d) { return d.source.y; })
			.attr("x2", function(d) { return d.target.x; })
			.attr("y2", function(d) { return d.target.y; }); 
	
		node.attr("cx", function(d) { return d.x; })
			.attr("cy", function(d) { return d.y; });
		
		label.attr("x", function(d) { return (d.source.x + d.target.x) / 2; }) 
        .attr("y", function(d) { return (d.source.y + d.target.y) / 2; })
	}
	 
	//Mouseover function
	function showDetails(d,i){
		content = '<p class="">' + d.source + '</span></p>'
		content += '<hr class="">'
		content += '<p class="">' + d.target + '</span></p>'
		//tooltip.showTooltip(content,d3.event)
		//console.log(content);
		//higlight connected links
		var tableData = [];
		link.attr("stroke", function(l) {
			if (l.source == d || l.target == d){ 
				tableData.push(l);
				return "red"; 
			}
			else { 
				return "#ddd";
			}
		  })
		  .attr("stroke-opacity", function(l){
			if (l.source == d || l.target == d)
				return 1.0; 
			else 
				return 0.5;
		});
		var table;
		function tabulate(data, columns) {
			table = d3.select('.demoContainer')
			  .append('table')
			  .attr("id","summTable");
			var thead = table.append('thead');
			var	tbody = table.append('tbody');
			// append the header row
			thead.append('tr')
			  .selectAll('th')
			  .data(columns).enter()
			  .append('th')
				.text(function (column) { return column; });

			// create a row for each object in the data
			var rows = tbody.selectAll('tr')
			  .data(data)
			  .enter()
			  .append('tr');

			// create a cell in each row for each column
			var cells = rows.selectAll('td')
			  .data(function (row) {
				return columns.map(function (column) {
				  return {column: column, value: row[column]};
				});
			  })
			  .enter()
			  .append('td')
				.text(function (d) { return d.value; });

		  return table;
		}
		
		// render the table(s)
		tabulate(tableData, ['srcObj', 'destObj']); // 2 column table
		
		label.attr("fill-opacity", function(l) {
			if (l.source == d || l.target == d){ 
				return 1; 
			}
			else { 
				return 0;
			}
		});
		
		//highlighting marker
		//console.log(link);
		//marker[0][0].style.stroke = "red"
		//marker[0][0].attr("stroke", "red")
		 // .attr("stroke-opacity", 1.0);
		
		//highlight neighboring nodes
		node.style("stroke", function(n){
			if (neighboring(d, n)){
				return "red"; 
			}
			else 
				return "#ddd";
		})
		.style("stroke-width", function(n) {
			if (neighboring(d, n)) 
				return 2.0; 
			else 
				return 1.0;
		});
				
	  
		//highlight the node being moused over
		d3.select(this).style("stroke","black")
			.style("stroke-width", 2.0);
	}
  
	//Mouseout function
	function hideDetails (d,i) {
		node.style("stroke", function (n) {
				return "#ddd";
			})
			.style("stroke-width", function(n){return 1.0});

		link.attr("stroke", "#ddd")
			.attr("stroke-opacity", 0.8);
		
		label.attr("fill-opacity", 0);
		
		d3.select("#summTable").remove();

	}
}

