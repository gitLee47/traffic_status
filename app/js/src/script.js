(function(){
	loadAndStart("/traffic_status", false);
})()

function loadAndStart(endpoint, clear) {
	if(clear) {
		//console.log("true");
		d3.select("#vizContainer").selectAll("svg").remove();
		d3.select("#sentContainer").selectAll("svg").remove();
		d3.select("#recievedContainer").selectAll("svg").remove();
	}
	
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
            return endpoint;
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
};

//Starting Code for building graph
function createCharts(tdata) {
	/* --------------Setup Start ------------------------------- */
	
	var width = 960,
    height = 500;

	var color = d3.scale.category20();

	var force = d3.layout.force()
		.gravity(.05)
		.distance(200)
		.charge(-100)
		.size([width, height]);
		
	//container for force graph
	var svg = d3.select("#vizContainer").append("svg")
		.attr("width", width)
		.attr("height", height)
		//.append('svg:g')
			.call(d3.behavior.zoom().on("zoom", redraw))
		.append('svg:g');
		
	//container for sent bar graph
	var margin = {top: 20, right: 20, bottom: 70, left: 40},
		width = 600 - margin.left - margin.right,
		height = 300 - margin.top - margin.bottom;
		
	var sentBar = d3.select("#sentContainer").append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
			  .append("g")
				.attr("transform", 
					  "translate(" + margin.left + "," + margin.top + ")");
					  		
	var recievedBar = d3.select("#recievedContainer").append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
			  .append("g")
				.attr("transform", 
					  "translate(" + margin.left + "," + margin.top + ")");
					  
	var x = d3.scale.ordinal().rangeRoundBands([0, width], .1);
	var y = d3.scale.linear().range([height, 0]);

	var xAxis = d3.svg.axis()
		.scale(x)
		.orient("bottom");

	var yAxis = d3.svg.axis()
	.scale(y)
	.orient("left");

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
			d.fixed = true; 
			force.resume();
		}
		function releasenode(d) {
			d.fixed = false;
			//force.resume();
		}	
	/* --------------Setup End ------------------------------- */
	
	var links = tdata;
	
	var nodesByName = {};
	var linkedByIndex = {};
	var sentTotal = new Object();
	var recievedTotal =  new Object();
	
	links.forEach(function(link) {
		if(link.srcObj != null || link.destObj != null) {
			link.source = nodeByName(link.srcObj,link.srcType);
			link.target = nodeByName(link.destObj,link.destType);
			linkedByIndex[link.srcObj + "," + link.destObj] = 1;
			if (sentTotal.hasOwnProperty(link.srcObj)) {
				//alert('key is: ' + k + ', value is: ' + h[k]);
				sentTotal[link.srcObj] = sentTotal[link.srcObj] + link.packets;
			}
			else {
				sentTotal[link.srcObj] = link.packets;
			}
			
			if (recievedTotal.hasOwnProperty(link.destObj)) {
				//alert('key is: ' + k + ', value is: ' + h[k]);
				recievedTotal[link.destObj] = recievedTotal[link.destObj] + link.packets;
			}
			else {
				recievedTotal[link.destObj] = link.packets;
			}
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
	  
	var nlabel = svg.selectAll(".circle")
	   .data(nodes)
	.enter().append('text')
      .attr("dx", 10)
      .attr("dy", ".35em")
	  .text( function(d) {return d.name;})
      .style("stroke", "gray");
	  
	node.on("mouseover", showDetails)
        .on("mouseout", hideDetails)
	  
	//Start the force layout.
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
			
		//fixing label issue
		nlabel.attr("x", function (d) {
			return d.x;
		})
			.attr("y", function (d) {
			return d.y;
		});
	}
	 
	//Mouseover function
	function showDetails(d,i){
		
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
		
		//Start summary table creation
		var table;
		function tabulate(data, columns) {
			table = d3.select('#summary')
			  .append('table')
			  .attr("id","summTable")
			  .attr("height", height);
			  
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
		tabulate(tableData, ['srcObj', 'destObj','packets','traffic']); // 4 column table
		
		//highlight neighbouring nodes
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
		
		d3.select("#summTable").remove();

	}
	
	//Legends for types	
	var legend = svg.append("g");

	legend.selectAll('g').data(color.domain())
		.enter()
		.append('g')
		.each(function(d, i) {
			var g = d3.select(this);
			g.append("rect")
				.attr("x", 45)
				.attr("y", 320 + (i * 10))
				.attr("width", 10)
				.attr("height", 10)
				.style("fill", color);

			g.append("text")
				.attr("x", 60)
				.attr("y", 330 + (i * 10))
				.attr("height", 30)
				.attr("width", 100)
				.style("fill", "black")
				.text(function(d) { if(d == null) return "undefined"; return d; });

		});
	
	//Starting Sent Packets Bar Chart
	var sentArr = [];
	var k = Object.getOwnPropertyNames(sentTotal);
    var v = Object.values(sentTotal);

	for (var i = 0; i < k.length; i++)
    {
        //console.log(k[i]+" "+v[i]);
		sentArr.push({src:k[i], packets:v[i]})
    }
	
	sentArr.sort(function(a, b) {
		if ( a.src < b.src )
			return -1;
		if ( a.src > b.src )
			return 1;
		return 0;
	});
	
	x.domain(sentArr.map(function(d) { return d.src; }));
	y.domain([0, d3.max(sentArr, function(d) { return d.packets; })]);
	
	sentBar.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

	sentBar.append("g")
	  .attr("class", "y axis")
	  .call(yAxis);

	sentBar.selectAll(".bar")
      .data(sentArr)
    .enter().append("rect")
      .attr("class", "bar-sent")
      .attr("x", function(d) { return x(d.src); })
      .attr("y", function(d) { return y(d.packets); })
      .attr("height", function(d) { return height - y(d.packets); })
      .attr("width", x.rangeBand());
	  
	//Starting Received Packets Bar Chart
	var recievedArr = [];
	var k = Object.getOwnPropertyNames(recievedTotal);
    var v = Object.values(recievedTotal);

	for (var i = 0; i < k.length; i++)
    {
		recievedArr.push({src:k[i], packets:v[i]})
    }
	
	recievedArr.sort(function(a, b) {
		if ( a.src < b.src )
			return -1;
		if ( a.src > b.src )
			return 1;
		return 0;
	});
	
	x.domain(recievedArr.map(function(d) { return d.src; }));
	y.domain([0, d3.max(recievedArr, function(d) { return d.packets; })]);
	
	recievedBar.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

	recievedBar.append("g")
	  .attr("class", "y axis")
	  .call(yAxis);

	recievedBar.selectAll(".bar")
      .data(recievedArr)
    .enter().append("rect")
      .attr("class", "bar-rec")
      .attr("x", function(d) { return x(d.src); })
      .attr("y", function(d) { return y(d.packets); })
      .attr("height", function(d) { return height - y(d.packets); })
      .attr("width", x.rangeBand());
}
/* Functions for helper popup box  */
function deselect(e) {
  $('.pop').slideFadeToggle(function() {
    e.removeClass('selected');
  });    
}

$(function() {
  $('#help').on('click', function() {
    if($(this).hasClass('selected')) {
      deselect($(this));               
    } else {
      $(this).addClass('selected');
      $('.pop').slideFadeToggle();
    }
    return false;
  });

  $('.close').on('click', function() {
    deselect($('#help'));
    return false;
  });
});

$.fn.slideFadeToggle = function(easing, callback) {
  return this.animate({ opacity: 'toggle', height: 'toggle' }, 'fast', easing, callback);
};
