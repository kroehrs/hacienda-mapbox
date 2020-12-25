// import react
import React, { useState } from 'react';

// import mapbox react library
import ReactMapGl, { Marker, Popup } from 'react-map-gl';

import {
    Editor,
    EditingMode,
    DrawLineStringMode,
    DrawPolygonMode,
} from 'react-map-gl-draw';

// import water icon
import { IoIosWater } from 'react-icons/io';

// import firebase file
import fire from './firebase';

export default function App() {
    const handleUpdate = (val) => {
        console.log(val);
        setFeatures(val.data);
    };

    const [features, setFeatures] = useState([]);

    const [modeIdHook, setModeIdHook] = useState(null);

    const [modeHandlerHook, setModeHandlerHook] = useState(null);

    const MODES = [
        {
            id: 'drawPolyline',
            text: 'Draw Polyline',
            handler: DrawLineStringMode,
        },
        { id: 'drawPolygon', text: 'Draw Polygon', handler: DrawPolygonMode },
        { id: 'editing', text: 'Edit Feature', handler: EditingMode },
    ];

    const switchMode = (e) => {
        const modeId = e.target.value === modeIdHook ? null : e.target.value;
        const mode = MODES.find((m) => m.id === modeId);
        const modeHandler = mode ? new mode.handler() : null;

        setModeIdHook(modeId);
        setModeHandlerHook(modeHandler);
    };

    const renderToolbar = () => {
        return (
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    maxWidth: '320px',
                }}
            >
                <select onChange={switchMode}>
                    <option value="">--Please choose a draw mode--</option>
                    {MODES.map((mode) => (
                        <option key={mode.id} value={mode.id}>
                            {mode.text}
                        </option>
                    ))}
                </select>
            </div>
        );
    };

    // store map styles
    const normalView = 'mapbox://styles/kyleroehrs/ckimhjmvt13cp17oc1gkcrqrh';
    const streetView = 'mapbox://styles/kyleroehrs/ckimi49y22qmo17o4l9d9g80u';

    // set starting veiwport to be passed to map component
    const [viewport, setViewport] = useState({
        width: '100vw',
        height: '100vh',
        latitude: 37.691388,
        longitude: -121.89472,
        zoom: 14,
    });

    // hook to change  map style
    const [mapStyle, setMapStyle] = useState(normalView);

    // hook to hide markers
    const [showMarkers, setShowMarkers] = useState(true);

    // hook to store markers being placed
    const [markers, setMarkers] = useState([]);

    const [drag, setDrag] = useState(false);

    // which popup shows
    const [popShowing, setPopShowing] = useState('');

    // initial state from database
    const dataSet = [];

    // set up database
    const db = fire.firestore();

    // query markers and populate starting state
    const loadDb = async () => {
        const dbMarkers = await db.collection('markers').get();

        dbMarkers.forEach((doc) => {
            dataSet.push({
                lng: doc.data().lng,
                lat: doc.data().lat,
                key: doc.id,
                keyName: doc.id,
            });
        });

        setMarkers(dataSet);

        const dbFeatures = await db.collection('features').get();

        let typeName;
        let newArr;

        dbFeatures.forEach((doc) => {
            const feature = doc.data();

            newArr = feature.geometry.coordinates.map((cur) => {
                return [cur.N_, cur.x_];
            });

            typeName = feature.geometry.type;
        });

        setFeatures([
            {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: typeName,
                    coordinates: [newArr],
                },
            },
        ]);
    };

    // post to database
    const postToDb = async (event) => {
        const docRef = await db.collection('markers').add({
            lng: event.lngLat[0],
            lat: event.lngLat[1],
        });

        setMarkers((prev) => {
            return [
                ...prev,
                {
                    lng: event.lngLat[0],
                    lat: event.lngLat[1],
                    key: docRef.id,
                    keyName: docRef.id,
                },
            ];
        });
    };

    const dragEndHandler = (event, marker) => {
        let myList = markers.filter((cur) => {
            return marker.keyName !== cur.keyName;
        });
        setMarkers(() => {
            return [
                ...myList,
                {
                    lng: event.lngLat[0],
                    lat: event.lngLat[1],
                    key: marker.keyName,
                    keyName: marker.keyName,
                },
            ];
        });

        db.collection('markers').doc(marker.keyName).set({
            lng: event.lngLat[0],
            lat: event.lngLat[1],
        });
        setPopShowing('');
    };

    const iconClickHandler = (marker) => {
        if (drag) {
            setDrag(false);
            return;
        }
        if (popShowing === marker.keyName) {
            setPopShowing('');
        } else {
            setPopShowing(marker.keyName);
        }
    };

    return (
        <div>
            {/* {button to toggle map style} */}
            <button
                onClick={() => {
                    setMapStyle(
                        mapStyle === normalView ? streetView : normalView
                    );
                }}
            >
                {mapStyle === normalView ? 'Street View' : 'Normal View'}
            </button>

            {/* button to show and hide markers */}
            <button
                onClick={() => {
                    setShowMarkers((prev) => !prev);
                    console.dir(features);
                }}
            >
                {showMarkers ? 'Hide Markers' : 'Show Markers'}
            </button>
            {/* spread base viewport, update as dragged, pass in hook for map style, callback to add markers when clicked, place markers after load */}
            <ReactMapGl
                {...viewport}
                onLoad={() => {
                    loadDb();
                }}
                onViewportChange={(nextViewport) => setViewport(nextViewport)}
                mapboxApiAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
                mapStyle={mapStyle}
                // onClick={(event) => {
                //     postToDb(event);
                // }}
            >
                {/* map markers to the dom, hides them when hide button clicked */}
                {markers.map((marker) => {
                    return (
                        <Marker
                            latitude={marker.lat}
                            longitude={marker.lng}
                            key={marker.key}
                            keyName={marker.keyName}
                            draggable={true}
                            offsetLeft={-8}
                            offsetTop={-10}
                            onDragStart={() => setDrag(true)}
                            onDragEnd={(event) => {
                                dragEndHandler(event, marker);
                            }}
                        >
                            <IoIosWater
                                style={!showMarkers && { display: 'none' }}
                                onClick={() => {
                                    iconClickHandler(marker);
                                }}
                            />
                        </Marker>
                    );
                })}

                {markers.map((marker) => {
                    return (
                        !drag &&
                        marker.keyName === popShowing && (
                            <Popup
                                latitude={marker.lat}
                                longitude={marker.lng}
                                key={marker.key + 'popup'}
                                closeButton={true}
                                closeOnClick={true}
                                anchor="bottom"
                                dynamicPosition={false}
                                offsetTop={-13}
                                onClose={() => {
                                    setPopShowing({});
                                }}
                            >
                                Testing
                            </Popup>
                        )
                    );
                })}
                <Editor
                    // to make the lines/vertices easier to interact with
                    clickRadius={12}
                    mode={modeHandlerHook}
                    onUpdate={(e) => {
                        handleUpdate(e);
                    }}
                    features={features}
                />

                {renderToolbar()}
            </ReactMapGl>
        </div>
    );
}
