module.exports = {
    rdp: rdp,
    _perpendicularDistance: perpendicularDistance
}

// Calculates perpendicular distance between a line define by point p1 and p2 to point l
// See https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line
function perpendicularDistance(p1, p2, l) {
	
	var denominator = Math.sqrt(Math.pow(p2[1] - p1[1], 2) + Math.pow(p2[0] - p1[0], 2))
	var nominator = (p2[1] - p1[1]) * l[0] - (p2[0] - p1[0]) * l[1] + p2[0] * p1[1] - p2[1] * p1[0]
	var result = Math.abs(nominator/denominator)
	return result
}

// Reduce the number of points using the RDP algorith
// https://en.wikipedia.org/wiki/Ramer–Douglas–Peucker_algorithm
// Parameters:
//	Array of points => [ x, y ]
//  Float value controlling the reduction distance
// Returns:
//	Array of points => [ x, y ]
function rdp(points, epsilon) {
	var dmax = 0
	var index = 0
	var end = points.length - 1 

	for (var i = 1 ; i < (end - 1); i = i + 1 ) {
		var d  = perpendicularDistance(points[0], points[end], points[i]);
		if (d > dmax) {
			index = i
			dmax = d
		}
	}

	var resultArray
	if (dmax > epsilon) {
		var left = rdp(points.slice(0, index +  1), epsilon)
		var right = rdp(points.slice(index, end + 1), epsilon)
		resultArray = left.slice(0, left.length -1).concat(right)
	} else {
		// We can reduce, so just return first and last point of this sequence
		resultArray = [ points[0], points[end] ]
	}

	return resultArray
}