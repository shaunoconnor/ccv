var ccv = {
	array_group : function (seq, gfunc) {
		var i, j;
		var node = new Array(seq.length);
		for (i = 0; i < seq.length; i++)
			node[i] = {"parent" : -1,
					   "element" : seq[i],
					   "rank" : 0};
		for (i = 0; i < seq.length; i++)
		{
			if (!node[i].element)
				continue;
			var root = i;
			while (node[root].parent != -1)
				root = node[root].parent;
			for (j = 0; j < seq.length; j++)
			{
				if( i != j && node[j].element && gfunc(node[i].element, node[j].element))
				{
					var root2 = j;

					while (node[root2].parent != -1)
						root2 = node[root2].parent;

					if(root2 != root)
					{
						if(node[root].rank > node[root2].rank)
							node[root2].parent = root;
						else
						{
							node[root].parent = root2;
							if (node[root].rank == node[root2].rank)
							node[root2].rank++;
							root = root2;
						}

						/* compress path from node2 to the root: */
						var temp, node2 = j;
						while (node[node2].parent != -1)
						{
							temp = node2;
							node2 = node[node2].parent;
							node[temp].parent = root;
						}

						/* compress path from node to the root: */
						node2 = i;
						while (node[node2].parent != -1)
						{
							temp = node2;
							node2 = node[node2].parent;
							node[temp].parent = root;
						}
					}
				}
			}
		}
		var idx = new Array(seq.length);
		var class_idx = 0;
		for(i = 0; i < seq.length; i++)
		{
			j = -1;
			var node1 = i;
			if(node[node1].element)
			{
				while (node[node1].parent != -1)
					node1 = node[node1].parent;
				if(node[node1].rank >= 0)
					node[node1].rank = ~class_idx++;
				j = ~node[node1].rank;
			}
			idx[i] = j;
		}
		return {"index" : idx, "class" : class_idx};
	},

	__run_bbf_feature : function (feature, step, u8, u8o) {
		var p, pmin = u8[feature.pz[0]][u8o[feature.pz[0]] + feature.px[0] * 4 + feature.py[0] * step[feature.pz[0]]];
		var n, nmax = u8[feature.nz[0]][u8o[feature.nz[0]] + feature.nx[0] * 4 + feature.ny[0] * step[feature.nz[0]]];
		if (pmin <= nmax)
			return 0;
		var i;
		for (i = 0; i < feature.size; i++) {
			if (feature.pz[i] >= 0) {
				p = u8[feature.pz[i]][u8o[feature.pz[i]] + feature.px[i] * 4 + feature.py[i] * step[feature.pz[i]]];
				if (p < pmin) {
					if (p <= nmax)
						return 0;
					pmin = p;
				}
			}
			if (feature.nz[i] >= 0) {
				n = u8[feature.nz[i]][u8o[feature.nz[i]] + feature.nx[i] * 4 + feature.ny[i] * step[feature.nz[i]]];
				if (n > nmax) {
					if (pmin <= n)
						return 0;
					nmax = n;
				}
			}
		}
		return 1;
	},

	detect_objects : function (canvas, cascade, interval, min_neighbors) {
		var scale = Math.pow(2, 1 / (interval + 1));
		var next = interval + 1;
		var scale_upto = Math.floor(Math.log(Math.min(cascade.width, cascade.height)) / Math.log(scale));
		var pyr = new Array((scale_upto + next * 2) * 4);
		pyr[0] = canvas;
		pyr[0].data = pyr[0].getContext("2d").getImageData(0, 0, pyr[0].width, pyr[0].height).data;
		var i, j, k, x, y, q;
		for (i = 1; i <= interval; i++) {
			pyr[i * 4] = document.createElement("canvas");
			pyr[i * 4].width = Math.floor(pyr[0].width / Math.pow(scale, i));
			pyr[i * 4].height = Math.floor(pyr[0].height / Math.pow(scale, i));
			pyr[i * 4].getContext("2d").drawImage(pyr[0], 0, 0, pyr[0].width, pyr[0].height, 0, 0, pyr[i * 4].width, pyr[i * 4].height);
			pyr[i * 4].data = pyr[i * 4].getContext("2d").getImageData(0, 0, pyr[i * 4].width, pyr[i * 4].height).data;
		}
		for (i = next; i < scale_upto + next * 2; i++) {
			pyr[i * 4] = document.createElement("canvas");
			pyr[i * 4].width = Math.floor(pyr[i * 4 - next * 4].width / 2);
			pyr[i * 4].height = Math.floor(pyr[i * 4 - next * 4].height / 2);
			pyr[i * 4].getContext("2d").drawImage(pyr[i * 4 - next * 4], 0, 0, pyr[i * 4 - next * 4].width, pyr[i * 4 - next * 4].height, 0, 0, pyr[i * 4].width, pyr[i * 4].height);
			pyr[i * 4].data = pyr[i * 4].getContext("2d").getImageData(0, 0, pyr[i * 4].width, pyr[i * 4].height).data;
		}
		for (i = next * 2; i < scale_upto + next * 2; i++) {
			pyr[i * 4 + 1] = document.createElement("canvas");
			pyr[i * 4 + 1].width = Math.floor(pyr[i * 4 - next * 4].width / 2);
			pyr[i * 4 + 1].height = Math.floor(pyr[i * 4 - next * 4].height / 2);
			pyr[i * 4 + 1].getContext("2d").drawImage(pyr[i * 4 - next * 4], 1, 0, pyr[i * 4 - next * 4].width - 1, pyr[i * 4 - next * 4].height, 0, 0, pyr[i * 4 + 1].width - 2, pyr[i * 4 + 1].height);
			pyr[i * 4 + 1].data = pyr[i * 4 + 1].getContext("2d").getImageData(0, 0, pyr[i * 4 + 1].width, pyr[i * 4 + 1].height).data;
			pyr[i * 4 + 2] = document.createElement("canvas");
			pyr[i * 4 + 2].width = Math.floor(pyr[i * 4 - next * 4].width / 2);
			pyr[i * 4 + 2].height = Math.floor(pyr[i * 4 - next * 4].height / 2);
			pyr[i * 4 + 2].getContext("2d").drawImage(pyr[i * 4 - next * 4], 0, 1, pyr[i * 4 - next * 4].width, pyr[i * 4 - next * 4].height - 1, 0, 0, pyr[i * 4 + 2].width, pyr[i * 4 + 2].height - 2);
			pyr[i * 4 + 2].data = pyr[i * 4 + 2].getContext("2d").getImageData(0, 0, pyr[i * 4 + 2].width, pyr[i * 4 + 2].height).data;
			pyr[i * 4 + 3] = document.createElement("canvas");
			pyr[i * 4 + 3].width = Math.floor(pyr[i * 4 - next * 4].width / 2);
			pyr[i * 4 + 3].height = Math.floor(pyr[i * 4 - next * 4].height / 2);
			pyr[i * 4 + 3].getContext("2d").drawImage(pyr[i * 4 - next * 4], 1, 1, pyr[i * 4 - next * 4].width - 1, pyr[i * 4 - next * 4].height - 1, 0, 0, pyr[i * 4 + 3].width - 2, pyr[i * 4 + 3].height - 2);
			pyr[i * 4 + 3].data = pyr[i * 4 + 3].getContext("2d").getImageData(0, 0, pyr[i * 4 + 3].width, pyr[i * 4 + 3].height).data;
		}
		var scale_x = 1, scale_y = 1;
		var dx = [0, 1, 0, 1];
		var dy = [0, 0, 1, 1];
		var seq = [];
		for (i = 0; i < scale_upto; i++) {
			var qw = pyr[i * 4 + next * 8].width - Math.floor(cascade.width / 4);
			var qh = pyr[i * 4 + next * 8].height - Math.floor(cascade.height / 4);
			var step = [pyr[i * 4].width * 4, pyr[i * 4 + next * 4].width * 4, pyr[i * 4 + next * 8].width * 4];
			var paddings = [pyr[i * 4].width * 16 - qw * 16,
							pyr[i * 4 + next * 4].width * 8 - qw * 8,
							pyr[i * 4 + next * 8].width * 4 - qw * 4];
			for (q = 0; q < 4; q++) {
				var u8 = [pyr[i * 4].data, pyr[i * 4 + next * 4].data, pyr[i * 4 + next * 8 + q].data];
				var u8o = [dx[q] * 8 + dy[q] * pyr[i * 4].width * 8, dx[q] * 4 + dy[q] * pyr[i * 4 + next * 4].width * 4, 0];
				for (y = 0; y < qh; y++) {
					for (x = 0; x < qw; x++) {
						var sum = 0;
						var flag = true;
						for (j = 0; j < cascade.stage_classifier.length; j++) {
							sum = 0;
							var alpha = cascade.stage_classifier[j].alpha;
							var feature = cascade.stage_classifier[j].feature;
							for (k = 0; k < cascade.stage_classifier[j].count; k++)
								sum += alpha[k * 2 + ccv.__run_bbf_feature(feature[k], step, u8, u8o)];
							if (sum < cascade.stage_classifier[j].threshold) {
								flag = false;
								break;
							}
						}
						if (flag) {
							seq.push({"x" : (x * 4 + dx[q] * 2) * scale_x,
									  "y" : (y * 4 + dy[q] * 2) * scale_y,
									  "width" : cascade.width * scale_x,
									  "height" : cascade.height * scale_y,
									  "neighbor" : 1,
									  "confidence" : sum});
						}
						u8o[0] += 16;
						u8o[1] += 8;
						u8o[2] += 4;
					}
					u8o[0] += paddings[0];
					u8o[1] += paddings[1];
					u8o[2] += paddings[2];
				}
			}
			scale_x *= scale;
			scale_y *= scale;
		}
		if (!(min_neighbors > 0))
			return seq;
		else {
			var result = ccv.array_group(seq, function (r1, r2) {
				var distance = Math.floor(r1.width * 0.25 + 0.5);

				return r2.x <= r1.x + distance &&
					   r2.x >= r1.x - distance &&
					   r2.y <= r1.y + distance &&
					   r2.y >= r1.y - distance &&
					   r2.width <= Math.floor(r1.width * 1.5 + 0.5) &&
					   Math.floor(r2.width * 1.5 + 0.5) >= r1.width;
			});
			var ncomp = result.class;
			var idx_seq = result.index;
			var comps = new Array(ncomp + 1);
			for (i = 0; i < comps.length; i++)
				comps[i] = {"neighbors" : 0,
							"x" : 0,
							"y" : 0,
							"width" : 0,
							"height" : 0,
							"confidence" : 0};

			// count number of neighbors
			for(i = 0; i < seq.length; i++)
			{
				var r1 = seq[i];
				var idx = idx_seq[i];

				if (comps[idx].neighbors == 0)
					comps[idx].confidence = r1.confidence;

				++comps[idx].neighbors;

				comps[idx].x += r1.x;
				comps[idx].y += r1.y;
				comps[idx].width += r1.width;
				comps[idx].height += r1.height;
				comps[idx].confidence = Math.max(comps[idx].confidence, r1.confidence);
			}

			var seq2 = [];
			// calculate average bounding box
			for(i = 0; i < ncomp; i++)
			{
				var n = comps[i].neighbors;
				if (n >= min_neighbors)
					seq2.push({"x" : (comps[i].x * 2 + n) / (2 * n),
							   "y" : (comps[i].y * 2 + n) / (2 * n),
							   "width" : (comps[i].width * 2 + n) / (2 * n),
							   "height" : (comps[i].height * 2 + n) / (2 * n),
							   "neighbors" : comps[i].neighbors,
							   "confidence" : comps[i].confidence});
			}

			var result_seq = [];
			// filter out small face rectangles inside large face rectangles
			for(i = 0; i < seq2.length; i++)
			{
				var r1 = seq2[i];
				var flag = 1;
				for(j = 0; j < seq2.length; j++)
				{
					var r2 = seq2[j];
					var distance = Math.floor(r2.width * 0.25 + 0.5);

					if(i != j &&
					   r1.x >= r2.x - distance &&
					   r1.y >= r2.y - distance &&
					   r1.x + r1.width <= r2.x + r2.width + distance &&
					   r1.y + r1.height <= r2.y + r2.height + distance &&
					   (r2.neighbors > Math.max(3, r1.neighbors) || r1.neighbors < 3))
					{
						flag = 0;
						break;
					}
				}

				if(flag)
					result_seq.push(r1);
			}
			return result_seq;
		}
	}
}