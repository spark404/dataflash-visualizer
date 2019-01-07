#!/bin/bash

lessc less/customize.less web/css/customize.css

# Use npm to update all the required modules for the lambdas
( 
	for name in visualizer-api visualizer-backend
	do
		(
			cd $name
			npm update
		)
	done
)