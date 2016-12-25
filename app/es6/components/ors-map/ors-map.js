angular.module('orsApp').directive('orsMap', () => {
    return {
        restrict: 'E',
        transclude: true,
        scope: {
            orsMap: '='
        },
        link: (scope, element, attrs) => {},
        controller: ['$scope', '$compile', '$timeout', 'orsSettingsFactory', 'orsObjectsFactory', 'orsRequestService', 'orsUtilsService', 'orsMapFactory', 'orsErrorhandlerService', 'orsCookiesFactory', ($scope, $compile, $timeout, orsSettingsFactory, orsObjectsFactory, orsRequestService, orsUtilsService, orsMapFactory, orsErrorhandlerService, orsCookiesFactory) => {
            const mapsurfer = L.tileLayer(orsNamespaces.layerMapSurfer.url, {
                attribution: orsNamespaces.layerMapSurfer.attribution
            });
            const openstreetmap = L.tileLayer(orsNamespaces.layerOSM.url, {
                attribution: orsNamespaces.layerOSM.attribution
            });
            const opencyclemap = L.tileLayer(orsNamespaces.layerOSMCycle.url, {
                attribution: orsNamespaces.layerOSMCycle.attribution
            });
            const stamen = L.tileLayer(orsNamespaces.layerStamen.url, {
                attribution: orsNamespaces.layerStamen.attribution
            });
            const hillshade = L.tileLayer(orsNamespaces.overlayHillshade.url, {
                format: 'image/png',
                opacity: 0.45,
                transparent: true,
                attribution: '<a href="http://srtm.csi.cgiar.org/">SRTM</a>; ASTER GDEM is a product of <a href="http://www.meti.go.jp/english/press/data/20090626_03.html">METI</a> and <a href="https://lpdaac.usgs.gov/products/aster_policies">NASA</a>'
            });
            $scope.geofeatures = {
                layerLocationMarker: L.featureGroup(),
                layerRoutePoints: L.featureGroup(),
                layerRouteLines: L.featureGroup(),
                layerAccessibilityAnalysis: L.featureGroup(),
                layerEmph: L.featureGroup(),
                layerTracks: L.featureGroup()
            };
            $scope.mapModel = {
                map: $scope.orsMap,
                geofeatures: $scope.geofeatures
            };
            $scope.baseLayers = {
                "MapSurfer": mapsurfer,
                "OpenStreetMap": openstreetmap,
                "OpenCycleMap": opencyclemap,
                "Stamen": stamen
            };
            $scope.overlays = {
                "Hillshade": hillshade
            };
            $scope.mapModel.map.on("load", (evt) => {
                mapsurfer.addTo($scope.orsMap);
                $scope.mapModel.geofeatures.layerRoutePoints.addTo($scope.orsMap);
                $scope.mapModel.geofeatures.layerRouteLines.addTo($scope.orsMap);
                $scope.mapModel.geofeatures.layerAccessibilityAnalysis.addTo($scope.orsMap);
                $scope.mapModel.geofeatures.layerEmph.addTo($scope.orsMap);
                $scope.mapModel.geofeatures.layerTracks.addTo($scope.orsMap);
                //Add layer control
                L.control.layers($scope.baseLayers, $scope.overlays).addTo($scope.orsMap);
            });
            // Check if map options set in cookies
            const mapOptions = orsCookiesFactory.getMapOptions();
            if (mapOptions) {
                if (mapOptions.mapCenter) $scope.mapModel.map.panTo(mapOptions.mapCenter);
                if (mapOptions.mapZoom) $scope.mapModel.map.setZoom(mapOptions.mapZoom);
            } else {
                // Heidelberg
                $scope.orsMap.setView([49.409445, 8.692953], 13);
            }
            /**
             * Listens to left mouse click on map
             * @param {Object} e: Click event
             */
            $scope.mapModel.map.on('contextmenu', (e) => {
                $scope.displayPos = e.latlng;
                let popupEvent;
                if ($scope.routing) {
                    popupEvent = $compile('<ors-popup></ors-popup>')($scope);
                } else {
                    popupEvent = $compile('<ors-aa-popup></ors-aa-popup>')($scope);
                }
                const popup = L.popup({
                    closeButton: true,
                    className: 'cm-popup'
                }).setContent(popupEvent[0]).setLatLng(e.latlng);
                $scope.mapModel.map.openPopup(popup);
            });
            //$scope.mapModel.map.on('baselayerchange', emitMapChangeBaseMap);
            //$scope.mapModel.map.on('overlayadd', emitMapChangeOverlay);
            //$scope.mapModel.map.on('overlayremove', emitMapChangeOverlay);
            //$scope.mapModel.map.on('zoomend', emitMapChangedEvent);
            //$scope.mapModel.map.on('zoomend', emitMapChangedZoom);
            $scope.mapModel.map.on('moveend', (e) => {
                const mapCenter = $scope.mapModel.map.getCenter();
                const mapZoom = $scope.mapModel.map.getZoom();
                const options = {
                    mapCenter: mapCenter,
                    mapZoom: mapZoom
                };
                orsCookiesFactory.setMapOptions(options);
            });
            $scope.processMapWaypoint = (idx, pos, updateWp = false, fireRequest = true) => {
                // add waypoint to map
                // get the address from the response
                if (updateWp) {
                    orsSettingsFactory.updateWaypoint(idx, '', pos, fireRequest);
                } else {
                    const waypoint = orsObjectsFactory.createWaypoint('', pos, 1);
                    orsSettingsFactory.insertWaypointFromMap(idx, waypoint, fireRequest);
                }
                orsSettingsFactory.getAddress(pos, idx, updateWp);
                orsUtilsService.parseSettingsToPermalink(orsSettingsFactory.getSettings(), orsSettingsFactory.getUserOptions());
                // close the popup
                $scope.mapModel.map.closePopup();
            };
            $scope.addWaypoint = (idx, iconIdx, pos, fireRequest = true, aaIcon = false) => {
                let waypointIcon = aaIcon === true ? new L.icon(lists.waypointIcons[3]) : new L.icon(lists.waypointIcons[iconIdx]);
                // create the waypoint marker
                let wayPointMarker = new L.marker(pos, {
                    icon: waypointIcon,
                    draggable: 'true',
                    idx: idx
                });
                wayPointMarker.addTo($scope.mapModel.geofeatures.layerRoutePoints);
                // If the waypoint is dragged
                wayPointMarker.on('dragend', (event) => {
                    // idx of waypoint
                    const idx = event.target.options.idx;
                    const pos = event.target._latlng;
                    console.log(fireRequest);
                    $scope.processMapWaypoint(idx, pos, true, fireRequest);
                });
            };
            $scope.clearMap = () => {
                $scope.mapModel.geofeatures.layerLocationMarker.clearLayers();
                $scope.mapModel.geofeatures.layerRoutePoints.clearLayers();
                $scope.mapModel.geofeatures.layerRouteLines.clearLayers();
                $scope.mapModel.geofeatures.layerAccessibilityAnalysis.clearLayers();
                $scope.mapModel.geofeatures.layerEmph.clearLayers();
            };
            $scope.reAddWaypoints = (waypoints, fireRequest = true, aaIcon = false) => {
                console.info("reAddWaypoints");
                $scope.clearMap();
                var idx = 0;
                angular.forEach(waypoints, (waypoint) => {
                    var iconIdx = orsSettingsFactory.getIconIdx(idx);
                    if (waypoint._latlng.lat && waypoint._latlng.lng) $scope.addWaypoint(idx, iconIdx, waypoint._latlng, fireRequest, aaIcon);
                    idx += 1;
                });
            };
            /**
             * Either zooms to feature, geometry or entire layer
             */
            $scope.zoom = (actionPackage) => {
                if (typeof actionPackage != 'undefined') {
                    if (typeof actionPackage.featureId != 'undefined') {
                        $scope.mapModel.geofeatures[actionPackage.layerCode].eachLayer((layer) => {
                            if (layer.options.index == actionPackage.featureId) {
                                $scope.orsMap.fitBounds(layer.getBounds());
                            }
                        });
                    } else if (actionPackage.featureId === undefined) {
                        if (actionPackage.geometry !== undefined) {
                            let bounds = new L.LatLngBounds(actionPackage.geometry);
                            $scope.orsMap.fitBounds(bounds);
                        } else {
                            $scope.orsMap.fitBounds(new L.featureGroup(Object.keys($scope.mapModel.geofeatures).map((key) => {
                                return $scope.mapModel.geofeatures[key];
                            })).getBounds());
                        }
                    }
                } else {
                    $scope.orsMap.fitBounds(new L.featureGroup(Object.keys($scope.mapModel.geofeatures).map((key) => {
                        return $scope.mapModel.geofeatures[key];
                    })).getBounds());
                }
            };
            /** 
             * Highlights marker on map
             * @param {Object} actionPackage - The action actionPackage
             */
            $scope.highlightWaypoint = (actionPackage) => {
                $scope.mapModel.geofeatures[actionPackage.layerCode].eachLayer((layer) => {
                    if (layer.options.idx == actionPackage.featureId) {
                        let waypointIcon;
                        if (layer.options.highlighted === true) {
                            const iconIdx = orsSettingsFactory.getIconIdx(layer.options.idx);
                            waypointIcon = new L.icon(lists.waypointIcons[iconIdx]);
                            layer.options.highlighted = false;
                        } else {
                            waypointIcon = new L.icon(lists.waypointIcons[3]);
                            layer.options.highlighted = true;
                        }
                        layer.setIcon(waypointIcon);
                    }
                });
            };
            /** 
             * adds features to specific layer
             * @param {Object} actionPackage - The action actionPackage
             */
            $scope.addFeatures = (actionPackage) => {
                let polyLine = L.polyline(actionPackage.geometry, {
                    index: !(actionPackage.featureId === undefined) ? actionPackage.featureId : null
                }).addTo($scope.mapModel.geofeatures[actionPackage.layerCode]);
                polyLine.setStyle(actionPackage.style);
            };
            /** 
             * adds polygon array to specific layer
             * @param {Object} actionPackage - The action actionPackage
             */
            $scope.addPolygons = (actionPackage) => {
                const getGradientColor = (rangePos) => {
                    hsl = Math.floor(120 - 120 * rangePos);
                    return "hsl(" + hsl + ", 100%, 50%" + ")";
                };
                for (var i = actionPackage.geometry.length - 1; i >= 0; i--) {
                    L.polygon(actionPackage.geometry[i], {
                        fillColor: actionPackage.geometry.length == 1 ? getGradientColor(1) : getGradientColor(i / (actionPackage.geometry.length - 1)),
                        color: '#000',
                        weight: 1,
                        fillOpacity: 1
                    }).addTo($scope.mapModel.geofeatures[actionPackage.layerCode]);
                }
                // hack to change opacity of entire overlaypane layer but prevent opacity of stroke
                let svg = d3.select($scope.mapModel.map.getPanes().overlayPane).style("opacity", 0.5);
                svg.selectAll("path").style("stroke-opacity", 1);
            };
            /** 
             * clears layer entirely or specific layer in layer
             */
            $scope.clear = (actionPackage) => {
                if (!(actionPackage.featureId === undefined)) {
                    $scope.mapModel.geofeatures[actionPackage.layerCode].eachLayer((layer) => {
                        if (layer.options.index == actionPackage.featureId) {
                            $scope.mapModel.geofeatures[actionPackage.layerCode].removeLayer(layer);
                        }
                    });
                } else {
                    $scope.mapModel.geofeatures[actionPackage.layerCode].clearLayers();
                }
            };
            orsSettingsFactory.subscribeToNgRoute(function onNext(route) {
                let svg = d3.select($scope.mapModel.map.getPanes().overlayPane);
                $scope.clearMap();
                $scope.routing = route == 'routing' ? true : false;
                if ($scope.routing) svg.style("opacity", 1);
            });
            orsSettingsFactory.subscribeToWaypoints(function onNext(d) {
                console.log('changes in routing waypoints detected..', d);
                const waypoints = d;
                // re-add waypoints only after init
                if (waypoints.length > 0) $scope.reAddWaypoints(waypoints, $scope.routing);
            });
            orsSettingsFactory.subscribeToAaWaypoints(function onNext(d) {
                console.log('changes in aa waypoints detected..', d);
                const waypoints = d;
                // re-add waypoints only after init
                if (waypoints.length > 0) $scope.reAddWaypoints(waypoints, $scope.routing, true);
                // $scope.addWaypoint(idx, iconIdx, waypoint._latlng, fireRequest);
            });
            /**
             * Dispatches all commands sent by Mapservice by using id and then performing the corresponding function
             */
            orsMapFactory.subscribeToMapFunctions(function onNext(params) {
                switch (params._actionCode) {
                    /** zoom to features */
                    case 0:
                        $scope.zoom(params._package);
                        break;
                        /** add features */
                    case 1:
                        $scope.addFeatures(params._package);
                        break;
                    case 2:
                        $scope.clear(params._package);
                        break;
                    case 3:
                        $scope.highlightWaypoint(params._package);
                        break;
                    case 4:
                        $scope.addPolygons(params._package);
                        break;
                    case 5:
                        $scope.clearMap();
                        break;
                    default:
                        break;
                }
            });
        }]
    };
});
// directive to control the popup to add waypoints on the map
angular.module('orsApp').directive('orsPopup', ['$compile', '$timeout', 'orsSettingsFactory', ($compile, $timeout, orsSettingsFactory) => {
    return {
        restrict: 'E',
        require: '^orsMap', //one directive used,
        templateUrl: 'scripts/components/ors-map/directive-templates/ors-popup.html',
        link: (scope, elem, attr) => {
            scope.add = (idx) => {
                scope.processMapWaypoint(idx, scope.displayPos);
            };
        }
    };
}]);
angular.module('orsApp').directive('orsAaPopup', ['$compile', '$timeout', 'orsSettingsFactory', ($compile, $timeout, orsSettingsFactory) => {
    return {
        restrict: 'E',
        require: '^orsMap', //one directive used,
        templateUrl: 'scripts/components/ors-map/directive-templates/ors-aa-popup.html',
        link: (scope, elem, attr) => {
            scope.add = (idx) => {
                //fourth argument to not fire a request on add waypoint
                scope.processMapWaypoint(idx, scope.displayPos, false, false);
            };
        }
    };
}]);