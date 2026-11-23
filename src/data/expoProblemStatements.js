/**
 * Expo round problem statements (from Team_Asterix_Expo_Problem_Statements.pdf).
 * Problem statement 1 (Parking Sensor with Auto-Brake) was dropped; the rest keep
 * their original numbers (2 to 6) to match the PDF.
 * The ids must match EXPO_PROBLEM_STATEMENTS in server/src/config/expoTeams.js,
 * which the server checks submissions against.
 */

export const EXPO_TEAM_COUNT = 49;

/* Most teams per problem statement. The server enforces it (EXPO_PS_CAP in
   server/src/config/expoTeams.js); keep the two the same. */
export const EXPO_PS_CAP = 20;

/* Shown on the Expo page. Update these when the date is confirmed. */
export const EXPO_DATE_LABEL = '5 December 2026';
export const EXPO_DATE_CONFIRMED = false;

/* Served from public/expo/. */
export const EXPO_PS_PDF_URL = '/expo/Team_Asterix_Expo_Problem_Statements.pdf';
export const EXPO_PS_PDF_NAME = 'Team_Asterix_Expo_Problem_Statements.pdf';

export const EXPO_OBJECTIVES = [
    'Build a real autonomous system that senses, decides and acts on its own, using what you learnt in both workshop tracks.',
    'Work as one team across electronics and software, the same way Team ASTERIX builds the autonomous buggy.',
    'Recreate a system people use every day, so every visitor understands what your project does.',
    'Test your system properly and show results, not just a working demo.'
];

export const EXPO_GROUND_RULES = [
    {
        title: 'Autonomy',
        text: 'Your system must sense, decide and act on its own for the whole demo. A phone or laptop may only give simple commands, such as a table number or a start button.'
    },
    {
        title: 'Safety',
        text: 'Anything that moves has an on/off switch that cuts power immediately. Wires are tied down and nothing hot or loose is left exposed.'
    },
    {
        title: 'State machine',
        text: "Draw your system's logic as a state diagram (states, what moves it between them, and a FAILSAFE state) and structure your code the same way."
    },
    {
        title: 'Live view',
        text: 'A web page or laptop screen shows sensor values, the current state and the decision being made, live during the demo.'
    },
    {
        title: 'Testing',
        text: 'Repeat your main task at least 10 times before the expo and show the results (how many times it worked, and the key numbers) on your poster.'
    },
    {
        title: 'Poster',
        text: 'Include a block diagram (inputs → processing → outputs), your circuit diagram, your state diagram and your test results.'
    },
    {
        title: 'Pitch',
        text: 'A 2-minute explanation of the problem, how your system solves it and what you learnt. Every member should be able to answer questions.'
    }
];

export const EXPO_PROBLEM_STATEMENTS = [
    {
        id: 'ps2-smart-toll-gate',
        number: 2,
        category: 'Smart Roads',
        title: 'FASTag-Style Smart Toll Gate',
        tagline: "A toll booth that reads a vehicle's tag, charges it and lets it through, with no one in the booth.",
        seenIn: 'FASTag toll plazas on national highways',
        power: 'Laptop USB',
        hardware: 'ESP32, RC522 RFID reader with cards, SG90 servo, IR sensor, LEDs, buzzer',
        cost: '₹700–800',
        problem: [
            'Before FASTag, every vehicle stopped at a toll booth to pay cash, causing long queues and wasted fuel. FASTag replaced this with a passive RFID sticker on the windscreen: a reader in the lane identifies the vehicle, the toll is deducted from a linked account, and the barrier lifts automatically.',
            "The team must build a working model toll lane. A toy car carrying an RFID tag approaches the booth. The system reads the tag, looks up the vehicle, checks its balance, deducts the correct toll for its vehicle type, shows the result on a laptop 'toll display' and lifts the barrier. Critically, the barrier must not close until the car has fully passed, and the system must reject unregistered tags, low balances and a tag being reused straight away.",
            'The real challenge is not just reading a card. It is making a dependable, fraud-resistant system that runs unattended, handles every case correctly and keeps a record of every transaction.'
        ],
        realLife: [
            'FASTag is mandatory on Indian national highways, and India is now moving towards barrier-less tolling that combines cameras and RFID.',
            'The same RFID access idea is used in metro gates, office turnstiles, apartment parking barriers and library book checkouts.',
            "The rule 'confirm the vehicle has passed before closing' copies real boom barriers, which use sensors in the road to avoid hitting cars."
        ],
        mustDo: [
            'Read an RFID card and identify the vehicle: registered number, type (car or truck) and balance.',
            'Deduct the correct toll (for example ₹65 for a car, ₹150 for a truck) and show the result and new balance on the toll display page.',
            'Lift the barrier, then close it only 1 second after the IR sensor confirms the car has cleared the gate.',
            'Reject unknown cards and low balances with a red light and buzzer; the barrier stays down.',
            'Reject the same card if it is used again within 60 seconds, and log every transaction.'
        ],
        electrical: [
            "Power: the ESP32 runs from the laptop's USB cable, which also powers the reader, servo and sensor.",
            "RFID reader: the RC522 connects to the ESP32's SPI pins (SCK, MISO, MOSI, SDA, RST). It is a 3.3 V device and must only be connected to the 3.3 V pin.",
            "Barrier: an SG90 servo with an ice-cream-stick boom, powered from the ESP32's 5 V (VIN) pin with a shared ground.",
            'Vehicle passed sensor: one IR sensor placed just after the barrier, facing across the lane.',
            'Signals: green and red LEDs with 220 Ω resistors and a buzzer through a transistor.',
            'Build: foam-board lane and booth; RFID cards or tags stuck under the toy cars so they pass 2–3 cm over the reader.'
        ],
        software: [
            "Vehicle records: a table in code of card ID, vehicle number, type and balance, saved in the ESP32's memory so balances survive a power cut.",
            'Transaction steps: read card → look up → check 60-second reuse rule → check balance → deduct → open → wait for the car to pass → close.',
            'State machine: WAITING → CHECKING → APPROVED or REJECTED → OPEN → CAR_PASSING → CLOSING → WAITING. In FAILSAFE (IR sensor not responding), the barrier stays open rather than risk closing on a car.',
            "Toll display and log: a web page served by the ESP32 and opened on the laptop. It shows each vehicle's result, a running list of transactions, total collected and a recharge form.",
            'Tailgating check: if the IR sensor sees two separate cars pass during one opening, raise an alarm and log a violation.'
        ],
        targets: [
            'A 12-event script run by the judges, covering valid cards, low balance, unknown card, reused card, recharge and a tailgating car. All 12 events must be handled correctly.',
            'Barrier lifts within 1 second of a valid card, and never closes while a car is under it.',
            'Balances are still correct after unplugging and reconnecting the ESP32.'
        ]
    },
    {
        id: 'ps3-serving-robot',
        number: 3,
        category: 'Service Robots',
        title: 'Restaurant Serving Robot',
        tagline: 'A robot waiter that carries an order from the kitchen to the right table and comes back on its own.',
        seenIn: 'Robot waiters in restaurants and food courts',
        power: '9 V battery (on the robot)',
        hardware: 'ESP32, 2WD chassis with BO motors, L9110S motor driver, 2 IR line sensors, HC-SR04, push switch, buzzer',
        cost: '₹900–1,000',
        problem: [
            "Many restaurants and food courts in Indian cities now use robot waiters. Staff place the food on the robot's tray and choose a table number. The robot goes to the table, waits for the customer to take the food and then returns. This frees staff for serving customers and leaves the repetitive walking to the robot.",
            "The team must build a serving robot that follows a black-tape path from a 'kitchen' to a chosen table. It must recognise when it has reached the right table, wait until the item is lifted off its tray, and then return. It shares the floor with people, so if someone steps in front it must stop and wait, not push through.",
            'Tables are marked by short black cross-lines on the path. The robot counts these marks to know where it is, the same way factory robots count stations along a track.'
        ],
        realLife: [
            'Robot waiters are now common in restaurants in Bengaluru, Chennai and Coimbatore.',
            'Hospitals use similar robots to deliver medicines and meals, and hotels use them for room service.',
            'Factories use line-following robots with station markers, exactly like this one, to carry parts between workstations.'
        ],
        mustDo: [
            'Accept an order (table 1, 2 or 3) from a phone web page.',
            'Follow the black-tape path and count the table markers to stop at the correct table.',
            'Wait until the item is lifted from the tray (or 20 seconds pass), then return to the kitchen and stop at the start mark.',
            'Stop for any obstacle closer than 20 cm and carry on once the path is clear.',
            "Show the robot's status on the phone: delivering, arrived, returning or blocked."
        ],
        electrical: [
            "Power: a 9 V battery through an on/off switch feeds the L9110S motor driver and the ESP32's VIN pin, with all grounds joined.",
            'Line sensing: two IR line sensors under the front of the robot, about 2 cm apart, on either side of the tape. When both sensors see black at once, the robot is crossing a table marker.',
            'Obstacle sensing: an HC-SR04 facing forward, with a resistor divider on the ECHO pin to bring 5 V down to 3.3 V.',
            'Tray sensing: a push switch under a cardboard tray. The weight of a cup holds it pressed; lifting the cup releases it.',
            "Signals: a buzzer for the 'your order is here' chime and an LED that shows the robot's status."
        ],
        software: [
            'Line following: if the left sensor sees black, steer left; if the right one does, steer right; if neither does, go straight. Speed is kept low for reliability.',
            "Table counting: each time both sensors see black, count one marker. Ignore new markers for half a second afterwards so one marker isn't counted twice.",
            'Order handling: the phone page sends the table number. The robot stops on the matching count, chimes, waits for the tray switch to release, then turns around and counts back to the kitchen.',
            "State machine: IDLE → DELIVERING → ARRIVED → WAITING_FOR_PICKUP → RETURNING → IDLE. BLOCKED waits 5 s, beeps 'excuse me', waits again, then reports on the phone. FAILSAFE stops if the line is lost for more than a second.",
            'Two-order mode: accept two orders and serve both tables in one trip before returning.'
        ],
        targets: [
            'Track with a kitchen and 3 tables; the robot reaches the requested table in 9 of 10 runs.',
            'Stops for a person stepping in front every time, and continues once they move away.',
            'A two-order trip is completed correctly in 4 of 5 attempts, with the trip time shown on the phone.'
        ]
    },
    {
        id: 'ps4-parking-lot-guide',
        number: 4,
        category: 'Smart City',
        title: 'Smart Parking Lot Guide',
        tagline: 'A parking lot that knows which slots are free and guides each car to the best one.',
        seenIn: 'Parking guidance in malls and airports',
        power: 'Laptop USB',
        hardware: 'ESP32, 5 IR sensors, red and green LEDs, SG90 servo',
        cost: '₹650–800',
        problem: [
            'Drivers in malls, airports and hospitals waste time circling for a free slot, which adds traffic and pollution inside the building. Parking guidance systems fix this. They sense every slot, show a green or red light above each one, display the free count at the entrance and send drivers straight to an empty slot.',
            "The team must build a model parking lot with 4 slots. It must sense whether each slot is taken, show each slot's status, tell an arriving driver which slot to use and keep the entry gate shut when the lot is full. It must behave like a real system: a car that is only driving past a slot must not be counted as parked, and the count must always be right.",
            "The smarter version also lets a driver reserve a slot from their phone, catches a car parking in someone else's reserved slot, and works out each car's parking fee from how long it stayed."
        ],
        realLife: [
            'Slot-by-slot guidance with green and red lights is used in Indian malls and airport multi-level car parks.',
            'City-wide versions feed free-slot data into apps, so drivers can check for parking before they leave home.',
            'The same idea is used in bus depots, truck yards and EV charging stations to manage space automatically.'
        ],
        mustDo: [
            'Sense each of the 4 slots and show its status on a green or red LED above it.',
            'Show the number of free slots and the recommended slot (nearest to the entrance) on the entrance display page.',
            "Open the entry gate for an arriving car only if a slot is free; otherwise show 'LOT FULL'.",
            'Update within 1–2 seconds of a car arriving or leaving, without false changes from cars driving past.',
            'Show a live map of the lot on a phone web page.'
        ],
        electrical: [
            "Power: the ESP32 runs from the laptop's USB cable, which powers the sensors, LEDs and servo.",
            'Slot sensing: one IR sensor in each of the 4 slots, plus one at the entry gate to detect an arriving car.',
            "Slot lights: a red and a green LED for each slot, each with a 220 Ω resistor (8 LEDs in total).",
            "Gate: an SG90 servo boom powered from the ESP32's 5 V (VIN) pin with a shared ground.",
            'Pin plan: 5 sensors, 8 LEDs and a servo use 14 ESP32 pins. Draw a pin map before wiring anything, and label every wire under the board.',
            'Build: foam-board lot with marked slots, sensors fixed in each slot, toy cars.'
        ],
        software: [
            "Steady sensing: a slot changes to 'taken' or 'free' only after the sensor has given the same reading for 2 seconds in a row, so a passing car doesn't count.",
            'Slot recommendation: each slot has a fixed distance from the entrance; the free slot with the smallest distance is recommended.',
            "Reservations: a phone page reserves a slot for 2 minutes (its LEDs blink). If a car arrives in a reserved slot without a reservation for that slot, raise a 'wrong slot' alert.",
            'Parking fee: record the time each slot becomes taken and free, and show the fee (₹10 per minute) on the page when the car leaves.',
            "State machine: each slot is FREE, RESERVED or TAKEN, and the lot is OPEN or FULL. In FAILSAFE a slot whose sensor gives impossible readings is marked 'unknown' and left out of the count."
        ],
        targets: [
            'A 20-step scenario run by the judges (cars arriving, leaving, reserving and parking in the wrong slot). Every slot light and count must be correct at every step.',
            'A car slowly driving past a slot never changes its status.',
            'The gate never opens when the lot is full.'
        ]
    },
    {
        id: 'ps5-robot-vacuum',
        number: 5,
        category: 'Home Robots',
        title: 'Mini Robot Vacuum with Cliff Sensing',
        tagline: 'A cleaning robot that covers a table top on its own and never drives off the edge.',
        seenIn: 'Robot vacuum cleaners',
        power: '9 V battery (on the robot)',
        hardware: 'ESP32, 2WD chassis with BO motors, L9110S motor driver, 2 IR sensors (cliff), 2 micro-switches (bumper)',
        cost: '₹850–950',
        problem: [
            "Robot vacuum cleaners are among the most widely sold autonomous robots in the world. To work unattended in a home they must do three things well: cover as much floor as possible, deal with walls and furniture, and, most importantly, never fall down the stairs. They do the last one with downward-facing infrared 'cliff sensors' at the front that notice when the floor disappears.",
            "The team must build a small cleaning robot that works on a table top. The table acts as a floor with a 'staircase' on every open side. The robot must clean on its own for 2 minutes using a cleaning pattern, sweep up paper bits with a pad or brush dragged behind it, turn away from walls, and detect every edge in time to stop and turn back.",
            'The smarter version compares cleaning patterns and measures which one actually cleans best, just as robot-vacuum companies do.'
        ],
        realLife: [
            'Robot vacuums from brands such as Roomba, Xiaomi and Eureka Forbes use exactly these sensors: cliff IR sensors, bumper switches and side brushes.',
            'Floor-scrubbing robots in airports and malls use the same coverage patterns on a larger scale.',
            'Edge detection is also used by delivery robots on pavements and warehouse robots near loading docks.'
        ],
        mustDo: [
            'Detect a table edge with the downward IR sensors, stop within 2 cm, then reverse and turn away.',
            'Detect walls with a bumper and turn away.',
            'Clean using at least two patterns: random bounce and spiral.',
            'Drag a cleaning pad or brush that collects paper bits.',
            'Stop after a 2-minute cleaning cycle with a beep, without falling off once.'
        ],
        electrical: [
            "Power: a 9 V battery through an on/off switch feeds the L9110S and the ESP32's VIN pin, with all grounds joined.",
            "Cliff sensors: two IR sensor modules under the front corners, placed ahead of the wheels and pointing straight down. Each module's sensitivity knob is tuned on the actual table.",
            'Bumper: a cardboard front bumper that presses one of two micro-switches when it hits a wall (left or right side), wired to ESP32 pins with internal pull-ups.',
            'Cleaning pad: a strip of cloth or an old toothbrush head fixed under the rear, with no motor needed.',
            'Signals: a buzzer and status LED; keep the robot light and compact so it stops quickly.'
        ],
        software: [
            'Cliff check comes first: both cliff sensors are checked on every loop, before anything else. Any edge means stop → reverse briefly → turn 120–150° away from that side.',
            'Cleaning patterns: random bounce (drive straight, turn a random angle after any edge or bump) and spiral (start in a tight circle and slowly widen it). Back-and-forth rows are a bonus third pattern.',
            'Cleaning cycle: a 2-minute timer, a pattern chosen from a phone page, and a beep at the end.',
            "State machine: IDLE → CLEANING → AVOID_EDGE or AVOID_WALL → CLEANING → DONE. FAILSAFE stops both motors if a cliff sensor gives an impossible reading (for example, both always 'no floor').",
            'Phone page: start/stop, pattern choice, time left and counts of edge and wall events.'
        ],
        targets: [
            'Test table: about 60 × 90 cm, open on two sides with walls on the other two, sprinkled with 30 paper bits.',
            'Zero falls in 10 two-minute runs.',
            'Run each cleaning pattern 3 times and count the paper bits collected. Show on the poster which pattern cleans best.'
        ]
    },
    {
        id: 'ps6-colour-sorter',
        number: 6,
        category: 'Industrial Automation',
        title: 'Colour-Sorting Conveyor',
        tagline: 'A conveyor that identifies each item by colour and pushes it into the right bin, with no human sorting.',
        seenIn: 'Grain, fruit and recycling sorting machines',
        power: 'Laptop USB',
        hardware: 'ESP32, BO motor with L9110S driver, IR sensor, 2 SG90 servos, laptop webcam',
        cost: '₹750–850',
        problem: [
            'Sorting is one of the oldest jobs in industry: fruit by ripeness, parcels by destination, plastic by type for recycling, grains by colour. Sorting by hand is slow and error-prone, so factories use conveyors with cameras that identify every item and fire a pusher at exactly the right moment to send it into the correct bin.',
            "The team must build a small conveyor that carries mixed coloured bottle caps, identifies each one's colour using the laptop's webcam, and uses servo flaps to push it into the correct bin while keeping a live count. Caps that don't match any known colour must carry on to a reject bin at the end of the belt.",
            'The hard part is timing. The camera sees the cap at one point, but the flap must push it at another point further down the belt, so the system must know how long the cap takes to get there.'
        ],
        realLife: [
            'Colour sorters are used to remove discoloured rice, pulses and coffee beans, and to grade fruit and vegetables in packhouses.',
            'Recycling plants sort plastics by colour using cameras and air jets; parcel hubs sort by barcode in the same way.',
            "Medicine factories reject tablets of the wrong colour or size using the same 'see, decide, push' design."
        ],
        mustDo: [
            'Run the belt at a steady speed.',
            "Detect each cap's arrival with an IR sensor and identify its colour with the webcam.",
            "Push red caps into bin 1 and blue caps into bin 2 with servo flaps, timed to the cap's position; all other colours go to the reject bin at the end.",
            'Show a live count of each colour on the laptop screen.',
            'Pause the belt if the camera cannot see clearly (for example, it is covered or the light is too dim).'
        ],
        electrical: [
            "Power: the ESP32 runs from the laptop's USB cable. The BO motor runs at 5 V from the ESP32's VIN pin through the L9110S driver, and PWM sets the belt speed.",
            'Conveyor: two cardboard tubes as rollers, a cloth or rubber strip as the belt, with the BO motor turning one roller. Add side guides so caps stay centred.',
            "Arrival sensor: one IR sensor just under the camera's view, facing across the belt.",
            'Flaps: two SG90 servos with cardboard paddles beside the belt, powered from VIN with a shared ground.',
            'Camera: the laptop webcam (or a phone used as a webcam) looking down at one spot on the belt, with a white card behind the belt and steady lighting.'
        ],
        software: [
            'Colour detection (Python + OpenCV on the laptop): when the ESP32 reports that a cap has arrived, take the frame, blur it slightly to reduce noise, convert it to HSV and find which colour range covers most of the cap.',
            "Learning the colours: capture 20 photos of each colour and work out each colour's HSV range from them, rather than guessing the numbers.",
            'Timing: measure how long a cap takes to travel from the camera point to each flap at the chosen belt speed. The ESP32 then waits that long and swings the right flap.',
            "Laptop–ESP32 link: a serial connection over the same USB cable. The ESP32 sends 'ARRIVED' and the laptop replies 'RED', 'BLUE' or 'REJECT'.",
            "State machine: RUNNING → CAP_ARRIVED → IDENTIFYING → SCHEDULED → PUSHING → RUNNING. FAILSAFE stops the belt if the laptop doesn't reply within 1 second."
        ],
        targets: [
            'Sort a mixed batch of 30 caps (red, blue and other colours) with at least 27 correct.',
            'Throughput of at least 10 caps per minute.',
            'Show a table on the poster of which colours were confused with which (a confusion matrix).'
        ]
    }
];

export const findProblemStatement = (id) => EXPO_PROBLEM_STATEMENTS.find((ps) => ps.id === id) || null;
