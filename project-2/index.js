minimumVotes = 2750;
minimumDown = -5;
minimumSize = 4;
maximumSize = 18;
minimumDistance = 150;
maximumDistance = 500;

runningForce = null;
data = { nodes: [], links: [] };
filteredData = null;

window.onload = function() {
  "use strict";

  // Parse the Data
  // name -> {name, originalCount}
  var subreddits = {};
  // source -> {dest, votes}
  var links = {};
  // image id -> original subreddit
  var images = {};
  stanfordData.forEach(function(item) {
    var subreddit = subreddits[item.subreddit];
    if (subreddit === undefined) {
      /* First time encountering subreddit */
      subreddits[item.subreddit] = {
        name: item.subreddit,
        originalCount: 0,
        upvotes: 0,
        downvotes: 0,
      };
      subreddit = subreddits[item.subreddit];
    }
    var image_id = item.image_id;
    if (images[image_id] === undefined) {
      /* Original Post */
      subreddit.originalCount++;
      images[image_id] = subreddit.name;
    } else {
      /* Repost */
      var originalSubredditName = images[image_id];
      subreddits[originalSubredditName].upvotes += item.number_of_upvotes || 0;
      subreddits[originalSubredditName].downvotes += item.number_of_downvotes || 0;

      var sourceLink = links[originalSubredditName];
      var targetLink = {
        destination: item.subreddit,
        upvotes: item.number_of_upvotes || 0,
        downvotes: item.number_of_downvotes || 0,
      };
      if (sourceLink === undefined) {
        links[originalSubredditName] = {
          targets: [targetLink],
          upvotes: item.number_of_upvotes || 0,
          downvotes: item.number_of_downvotes || 0,
        };
      } else {
        links[originalSubredditName].targets.push(targetLink);
      }
      links[originalSubredditName].upvotes += item.number_of_upvotes || 0;
      links[originalSubredditName].downvotes += item.number_of_downvotes || 0;
    }
  });


  Object.keys(subreddits).forEach(function(subreddit) {
    data.nodes.push(subreddits[subreddit]);
  });
  var compressedLinks = {};
  Object.keys(links).forEach(function(subreddit) {
    links[subreddit].targets.forEach(function(link) {
      var linkHash = subreddit + link.destination;
      if (compressedLinks[linkHash] === undefined) {
        compressedLinks[linkHash] = {
          source: subreddits[subreddit],
          target: subreddits[link.destination],
          value: link.upvotes - link.downvotes,
          reposts: 1,
        };
      } else {
        compressedLinks[linkHash].value += link.upvotes - link.downvotes;
        compressedLinks[linkHash].reposts++;
      }
    });
  });
  Object.keys(compressedLinks).forEach(function(linkHash) {
    data.links.push(compressedLinks[linkHash]);
  });

  /* Render */
  var width = 1024;
  var height = 768;

  // Initialize SVG Element
  var svg = d3.select('#network').append('svg')
    .attr('height', height)
    .attr('width', width);
  svg.append('g').attr('id', 'link');
  svg.append('g').attr('id', 'nodes');

  var distanceScale = d3.scale.linear()
    .range([40, 300]);

  // Create the Force Layout
  filterData();
  var force = d3.layout.force()
    .size([width, height])
    .nodes(filteredData.nodes)
    .links(filteredData.links)
    .linkStrength(0.55)
    .charge(-100)
    ;


  // Create a Linear Scale for Link Values to RGB Values
  var linkScale = d3.scale.linear()
    .range([0, 255]);


  // Create a Linear Scale for to scale a Node's originalCount to it's Radius
  var countScale = d3.scale.linear()
    .range([minimumSize, maximumSize]);

  var link = svg.selectAll('#link').selectAll('g');
  var nodes = svg.selectAll('#nodes').selectAll('g');

  /* Event Handlers */
  // Update Node Sizes when the minimumSize is changed.
  document.getElementById('minimumSize').onchange = function(event) {
    minimumSize = Number(event.target.value);
    updateNodeSizes();
  };

  // Update Node Sizes when the maximumSize is changed.
  document.getElementById('maximumSize').onchange = function(event) {
    maximumSize = Number(event.target.value);
    updateNodeSizes();
  };

  // Update Node Sizes
  document.getElementById('minimumVotes').onchange = function(event) {
    minimumVotes = Number(event.target.value);
    update();
  };
  document.getElementById('minimumDown').onchange = function(event) {
    minimumDown = -1 * Number(event.target.value);
    update();
  };

  // Update Link Distances
  document.getElementById('minimumDistance').onchange = function(event) {
    minimumDistance = Number(event.target.value);
    updateLinkDistances();
    runningForce = runningForce.start();
  };
  document.getElementById('maximumDistance').onchange = function(event) {
    maximumDistance = Number(event.target.value);
    updateLinkDistances();
    runningForce = runningForce.start();
  };

  // On Layout Update
  force.on('tick', function() {
    // Reposition the nodes
    nodes.selectAll('circle')
      .attr('cx', function(d) { return d.x; })
      .attr('cy', function(d) { return d.y; });
    nodes.selectAll('text')
      .attr('x', function(d) { return d.x - 10; })
      .attr('y', function(d) { return d.y; });

    // Reposition the links
    link.attr('x1', function(d) { return d.source.x; });
    link.attr('y1', function(d) { return d.source.y; });
    link.attr('x2', function(d) { return d.target.x; });
    link.attr('y2', function(d) { return d.target.y; });
  });

  runningForce = force.start();
  update();

  function update() {
    runningForce.stop();
    filterData();


    link = link.data(filteredData.links, function(d) { return d.source.name + '-to-' + d.target.name; });
    link.enter().insert('line')
      .attr('id', function(d) { return d.source.name + '-to-' + d.target.name; })
      .attr('class', function(d) { return 'link ' + d.source.name + ' ' + d.target.name; })
      .attr('stroke-width', '1px')
      .attr('stroke', function(d) {
        if (d.value > 0) {
          return 'green';
        } else {
          return 'red';
        }
      });
    link.exit().remove();
    updateLinkColors(link);
    updateLinkDistances();

    nodes = nodes.data(filteredData.nodes, function(d) { return d.name; });
    updateNodeDomain(nodes);
    nodes.enter().append('g');
    nodes.append('circle')
      .call(runningForce.drag)
      .attr('id', function(d) { return d.name; })
      .attr('class', 'node')
      .attr('stroke', 'black')
      .attr('stroke-width', '1px')
      .attr('r', function(d) { return countScale(d.originalCount); })
      .attr('fill', function(d) {
        /* Color nodes that are receptive to reposts with more green and nodes
        * resistant to reposts with more red.
        */
        var totalVotes = d.upvotes + d.downvotes;
        var red = Math.round(d.downvotes / totalVotes * 255);
        var green = Math.round(d.upvotes / totalVotes * 255);
        if (isNaN(red)) { red = 127; }
        if (isNaN(green)) { green = 127; }
        return toRGB(red, green, 0);
      });
    nodes.append('text')
      .call(runningForce.drag)
      .text(function(d) { return d.name; });
    nodes.exit().remove();

    runningForce.start();

  }

  function filterData() {
    filteredData = { nodes: [], links: [] };
    for (var i = 0; i < data.nodes.length; i++) {
      filteredData.nodes.push(data.nodes[i]);
    }
    for (var j = 0; j < data.links.length; j++) {
      if (data.links[j].value > minimumVotes ||
          data.links[j].value < minimumDown) {
        // Add links with the minimum number of votes
        filteredData.links.push(data.links[j]);
      }
    }

    // Remove nodes with no links
    var usedNodes = {};
    filteredData.links.forEach(function(link) {
      usedNodes[link.source.name] = true;
      usedNodes[link.target.name] = true;
    });
    filteredData.nodes = filteredData.nodes.filter(function(node) {
      return usedNodes[node.name];
    });
  }

  function updateLinkColors(link) {
    var linkValues = filteredData.links.map(
      function(link) { return link.value; }
    );
    linkScale = linkScale.domain(minMax(linkValues));
    link.attr('stroke', function(d) {
      if (d.value > 0) {
        return 'green';
      } else {
        return 'red';
      }
    });
  }

  function updateNodeDomain(nodes) {
    var originalCounts = filteredData.nodes.map(
      function(node) { return node.originalCount; }
    );
    countScale = countScale.domain(minMax(originalCounts));

    if (nodes !== undefined) {
      nodes.attr('r', function(d) { return countScale(d.originalCount); });
    }
    if (runningForce !== null) {
      runningForce = runningForce.resume();
    }
  }

  function updateNodeSizes() {
    countScale = countScale.range([minimumSize, maximumSize]);
    nodes.selectAll('circle')
      .attr('r', function(d) { return countScale(d.originalCount); });
    runningForce = runningForce.resume();
  }

  function updateLinkDistances() {
    var values = filteredData.links.map(function(d) { return d.value; });
    distanceScale = distanceScale
      .domain(minMax(values))
      .range([minimumDistance, maximumDistance]);
    runningForce = runningForce.linkDistance(function(d) {
      return distanceScale(d.value);
    });
  }

  function toRGB(red, green, blue) {
    return 'rgb(' + red + ',' + green + ',' + blue + ')';
  }

  function minMax(array) {
    /* Return a list of the minimum & maximum values in the array */
    return [Math.min.apply(null, array), Math.max.apply(null, array)];
  }

};
