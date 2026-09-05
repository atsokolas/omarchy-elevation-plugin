// Elevation — pure logic and the curated canon.
//
// Everything testable lives here so `node --test tests/model.test.js` can
// reach it; the QML files stay thin. Loaded by QML as `import "Model.js"`.

var APP_NAME = "Elevation"
var USER_AGENT = "omarchy-elevation/1.0 (https://omarchy.org; Omarchy shell plugin)"
var WIKI_API = "https://en.wikipedia.org/api/rest_v1/page/summary/"
var WIKI_PAGE = "https://en.wikipedia.org/wiki/"

// The nine silhouettes the bar icon can draw. Every building names one in
// `f`, chosen by hand — a style is a poor predictor of a shape (the Pantheon
// and the Colosseum are both "Roman").
var FORMS = ["columns", "dome", "spire", "pyramid", "pagoda", "arch", "slab", "tower", "curve"]

// The canon. `w` is the Wikipedia article title (the fetch key), `note` is the
// curated one-liner shown before the article lands and whenever the network is
// gone — the plugin is never blank, even offline. `y` is read by the timeline,
// so it leads with a number: "c. 800", "432 BC", "1st century".
//
// Order here is irrelevant: the day picker reshuffles the whole list every
// cycle, so nothing repeats until all of them have been seen.
var BUILDINGS = [
  { w: "Great_Pyramid_of_Giza", n: "Great Pyramid of Giza", a: "Hemiunu (attributed)", y: "c. 2560 BC", p: "Giza, Egypt", s: "Ancient Egyptian", f: "pyramid", note: "The only wonder of the ancient world still standing, and for 3,800 years the tallest thing anyone had built." },
  { w: "Parthenon", n: "Parthenon", a: "Iktinos and Kallikrates", y: "432 BC", p: "Athens, Greece", s: "Doric", f: "columns", note: "Almost nothing in it is straight — the columns lean inward and the floor bows upward to correct what the eye would otherwise get wrong." },
  { w: "Pantheon,_Rome", n: "Pantheon", a: "Apollodorus of Damascus (attributed)", y: "126", p: "Rome, Italy", s: "Roman", f: "dome", note: "Still the largest unreinforced concrete dome on earth, lightened toward the top with pumice and opened to the sky by a nine-metre oculus." },
  { w: "Colosseum", n: "Colosseum", a: "Vespasian and Titus", y: "80", p: "Rome, Italy", s: "Roman", f: "arch", note: "Eighty arched entrances could empty fifty thousand spectators in minutes — the stadium concourse was solved on the first attempt." },
  { w: "Pont_du_Gard", n: "Pont du Gard", a: "Roman engineers", y: "c. 50", p: "Vers-Pont-du-Gard, France", s: "Roman", f: "arch", note: "An aqueduct that falls just 2.5 centimetres across its length, cut so precisely that the stones needed no mortar." },
  { w: "Al-Khazneh", n: "Al-Khazneh", a: "Nabataean masons", y: "1st century", p: "Petra, Jordan", s: "Nabataean", f: "columns", note: "Not built but subtracted — a classical facade carved top-down into a sandstone cliff, with no scaffolding and no second chances." },
  { w: "Hagia_Sophia", n: "Hagia Sophia", a: "Isidore of Miletus and Anthemius of Tralles", y: "537", p: "Istanbul, Türkiye", s: "Byzantine", f: "dome", note: "A ring of windows at the dome's base makes 15,000 tonnes of masonry look like it is floating on light." },
  { w: "Dome_of_the_Rock", n: "Dome of the Rock", a: "Umayyad craftsmen", y: "691", p: "Jerusalem", s: "Umayyad", f: "dome", note: "The oldest surviving Islamic monument, and an octagon so exactly proportioned that its plan can be drawn from a single circle." },
  { w: "Borobudur", n: "Borobudur", a: "Sailendra builders", y: "c. 800", p: "Magelang, Indonesia", s: "Buddhist", f: "pyramid", note: "A mountain of stone you read with your feet: two thousand relief panels arranged so the climb is the text." },
  { w: "Great_Mosque_of_Córdoba", n: "Great Mosque of Córdoba", a: "Umayyad builders", y: "785", p: "Córdoba, Spain", s: "Moorish", f: "arch", note: "Double-tiered horseshoe arches in red and white, stacked to win height from columns that were too short." },
  { w: "Kandariya_Mahadeva_Temple", n: "Kandariya Mahadeva Temple", a: "Chandela builders", y: "1030", p: "Khajuraho, India", s: "Nagara", f: "spire", note: "The tower is built from 84 smaller replicas of itself — a mountain range assembled out of miniature mountains." },
  { w: "Durham_Cathedral", n: "Durham Cathedral", a: "Norman masons", y: "1133", p: "Durham, England", s: "Norman", f: "spire", note: "The first building in Europe to carry a pointed rib vault at scale, which quietly made the whole Gothic century possible." },
  { w: "Angkor_Wat", n: "Angkor Wat", a: "Suryavarman II", y: "c. 1150", p: "Siem Reap, Cambodia", s: "Khmer", f: "spire", note: "The largest religious structure ever built, oriented west so the spring equinox sun rises directly over its central tower." },
  { w: "Basilica_of_Saint-Denis", n: "Basilica of Saint-Denis", a: "Abbot Suger", y: "1144", p: "Saint-Denis, France", s: "Early Gothic", f: "spire", note: "Where Gothic starts: Suger wanted a church made of light, and the walls went to glass to get it." },
  { w: "Chartres_Cathedral", n: "Chartres Cathedral", a: "Unknown master masons", y: "1220", p: "Chartres, France", s: "High Gothic", f: "spire", note: "176 windows of twelfth-century glass survive, including a blue nobody has since been able to reproduce." },
  { w: "Sainte-Chapelle", n: "Sainte-Chapelle", a: "Pierre de Montreuil (attributed)", y: "1248", p: "Paris, France", s: "Rayonnant Gothic", f: "spire", note: "Structure reduced to the minimum needed to hold 600 square metres of stained glass — a reliquary you can stand inside." },
  { w: "Doge's_Palace", n: "Doge's Palace", a: "Filippo Calendario (attributed)", y: "1424", p: "Venice, Italy", s: "Venetian Gothic", f: "arch", note: "Inverted logic: the heavy wall sits on top and the delicate arcade below, which should look wrong and instead looks weightless." },
  { w: "Alhambra", n: "Alhambra", a: "Nasrid craftsmen", y: "1354", p: "Granada, Spain", s: "Nasrid", f: "arch", note: "Muqarnas vaults built from thousands of small cells, dissolving the ceiling into something closer to weather than stone." },
  { w: "Forbidden_City", n: "Forbidden City", a: "Kuai Xiang", y: "1420", p: "Beijing, China", s: "Ming", f: "pagoda", note: "980 buildings arranged on a single north–south axis, where hierarchy is expressed entirely in roof shape and colour." },
  { w: "Florence_Cathedral", n: "Florence Cathedral", a: "Filippo Brunelleschi (dome)", y: "1436", p: "Florence, Italy", s: "Renaissance", f: "dome", note: "Brunelleschi raised the largest masonry dome in the world with no centring at all, laying bricks in a self-supporting herringbone." },
  { w: "Ospedale_degli_Innocenti", n: "Ospedale degli Innocenti", a: "Filippo Brunelleschi", y: "1445", p: "Florence, Italy", s: "Renaissance", f: "arch", note: "A foundling hospital whose arcade is usually called the first Renaissance building — proportion as a civic argument." },
  { w: "Palazzo_Rucellai", n: "Palazzo Rucellai", a: "Leon Battista Alberti", y: "1451", p: "Florence, Italy", s: "Renaissance", f: "columns", note: "Alberti pasted the Colosseum's stacked orders flat onto a palace front and invented the facade as a designed surface." },
  { w: "Kinkaku-ji", n: "Kinkaku-ji", a: "Ashikaga Yoshimitsu", y: "1397", p: "Kyoto, Japan", s: "Muromachi", f: "pagoda", note: "Three storeys in three different architectural styles, gold-leafed and set so the pond does half the work." },
  { w: "Tempietto_del_Bramante", n: "Tempietto", a: "Donato Bramante", y: "1502", p: "Rome, Italy", s: "High Renaissance", f: "dome", note: "Barely fifteen metres tall and treated ever since as the perfect building — the whole High Renaissance in one drum." },
  { w: "St._Peter's_Basilica", n: "St. Peter's Basilica", a: "Bramante, Michelangelo, Maderno and Bernini", y: "1626", p: "Vatican City", s: "Renaissance and Baroque", f: "dome", note: "120 years, a queue of the era's best architects, and an argument about the dome that Michelangelo won posthumously." },
  { w: "Villa_La_Rotonda", n: "Villa La Rotonda", a: "Andrea Palladio", y: "1592", p: "Vicenza, Italy", s: "Renaissance", f: "columns", note: "Four identical porticos facing four directions — a plan so portable it was rebuilt across England and Virginia for centuries." },
  { w: "Laurentian_Library", n: "Laurentian Library", a: "Michelangelo", y: "1571", p: "Florence, Italy", s: "Mannerism", f: "columns", note: "The vestibule staircase pours down into the room like liquid, deliberately breaking every rule Michelangelo knew by heart." },
  { w: "Selimiye_Mosque,_Edirne", n: "Selimiye Mosque", a: "Mimar Sinan", y: "1575", p: "Edirne, Türkiye", s: "Ottoman", f: "dome", note: "Sinan called it his masterwork at 80 — a dome on eight piers with the supports pushed into the walls to clear the room." },
  { w: "Sheikh_Lotfollah_Mosque", n: "Sheikh Lotfollah Mosque", a: "Muhammad Reza ibn Ustad Husayn", y: "1619", p: "Isfahan, Iran", s: "Safavid", f: "dome", note: "A twisting entrance corridor rotates you 45 degrees without your noticing, so the dome arrives already squared to Mecca." },
  { w: "Taj_Mahal", n: "Taj Mahal", a: "Ustad Ahmad Lahori", y: "1653", p: "Agra, India", s: "Mughal", f: "dome", note: "The minarets lean outward a few degrees, so an earthquake would drop them away from the tomb rather than onto it." },
  { w: "Katsura_Imperial_Villa", n: "Katsura Imperial Villa", a: "Prince Toshihito and Toshitada", y: "1645", p: "Kyoto, Japan", s: "Sukiya", f: "pagoda", note: "The building the European modernists came to Japan to look at: a modular grid, sliding walls, and no facade at all." },
  { w: "Himeji_Castle", n: "Himeji Castle", a: "Ikeda Terumasa", y: "1609", p: "Himeji, Japan", s: "Japanese castle", f: "pagoda", note: "Two enormous timber pillars run the full height of the keep, and the approach spirals so attackers are always exposed." },
  { w: "San_Carlo_alle_Quattro_Fontane", n: "San Carlo alle Quattro Fontane", a: "Francesco Borromini", y: "1646", p: "Rome, Italy", s: "Baroque", f: "dome", note: "Borromini built the plan out of interlocking ovals and triangles on a site smaller than one of St Peter's piers." },
  { w: "Sant'Ivo_alla_Sapienza", n: "Sant'Ivo alla Sapienza", a: "Francesco Borromini", y: "1660", p: "Rome, Italy", s: "Baroque", f: "dome", note: "A six-pointed star plan that carries all the way up into the dome, refusing the circle the Baroque expected." },
  { w: "Palace_of_Versailles", n: "Palace of Versailles", a: "Louis Le Vau and Jules Hardouin-Mansart", y: "1682", p: "Versailles, France", s: "French Baroque", f: "columns", note: "The Hall of Mirrors used 357 mirrors when mirrors were a Venetian state secret — architecture as an act of industrial policy." },
  { w: "St_Paul's_Cathedral", n: "St Paul's Cathedral", a: "Christopher Wren", y: "1710", p: "London, England", s: "English Baroque", f: "dome", note: "Three domes in one: the one you see outside, the one you see inside, and the hidden brick cone that actually holds the lantern up." },
  { w: "Karlskirche", n: "Karlskirche", a: "Johann Bernhard Fischer von Erlach", y: "1737", p: "Vienna, Austria", s: "Baroque", f: "dome", note: "Two Trajan-style columns flank a Roman portico in front of a Baroque dome — an empire quoting three others at once." },
  { w: "Vierzehnheiligen", n: "Vierzehnheiligen", a: "Balthasar Neumann", y: "1772", p: "Bad Staffelstein, Germany", s: "Rococo", f: "dome", note: "Neumann laid the interior out on overlapping ovals so the vaults never land where the walls suggest they should." },
  { w: "Royal_Crescent", n: "Royal Crescent", a: "John Wood the Younger", y: "1774", p: "Bath, England", s: "Palladian", f: "columns", note: "Thirty houses given one enormous unified facade — speculative housing dressed as a single palace." },
  { w: "Panthéon,_Paris", n: "Panthéon", a: "Jacques-Germain Soufflot", y: "1790", p: "Paris, France", s: "Neoclassical", f: "columns", note: "Soufflot tried to give a classical temple Gothic structural slenderness, and cracked the piers proving it could be done." },
  { w: "Monticello", n: "Monticello", a: "Thomas Jefferson", y: "1809", p: "Charlottesville, Virginia", s: "Neoclassical", f: "dome", note: "Jefferson rebuilt it over forty years, hiding staircases and beds in walls while the enslaved built and ran all of it." },
  { w: "Altes_Museum", n: "Altes Museum", a: "Karl Friedrich Schinkel", y: "1830", p: "Berlin, Germany", s: "Neoclassical", f: "columns", note: "A colonnade of eighteen columns with a rotunda hidden behind — the museum reframed as a public room, not a treasury." },
  { w: "Sir_John_Soane's_Museum", n: "Sir John Soane's Museum", a: "John Soane", y: "1837", p: "London, England", s: "Neoclassical", f: "columns", note: "Soane hinged the walls so they open like books, and lit the basement with mirrors and coloured glass from above." },
  { w: "The_Crystal_Palace", n: "The Crystal Palace", a: "Joseph Paxton", y: "1851", p: "London, England", s: "Iron and glass", f: "arch", note: "A greenhouse gardener beat every architect in Britain: 90,000 square metres of prefabricated iron and glass, built in 39 weeks." },
  { w: "Palais_Garnier", n: "Palais Garnier", a: "Charles Garnier", y: "1875", p: "Paris, France", s: "Beaux-Arts", f: "columns", note: "More floor area is given to the staircase and foyers than to the auditorium — the audience is the performance." },
  { w: "Eiffel_Tower", n: "Eiffel Tower", a: "Gustave Eiffel and Maurice Koechlin", y: "1889", p: "Paris, France", s: "Wrought iron", f: "tower", note: "Its curve is exactly the profile that makes wind load equal at every height; the shape is an equation, not a taste." },
  { w: "Wainwright_Building", n: "Wainwright Building", a: "Louis Sullivan", y: "1891", p: "St. Louis, Missouri", s: "Chicago School", f: "tower", note: "Sullivan gave the steel frame a vertical expression instead of a stack of masonry floors, and the skyscraper found its face." },
  { w: "Hôtel_Tassel", n: "Hôtel Tassel", a: "Victor Horta", y: "1893", p: "Brussels, Belgium", s: "Art Nouveau", f: "slab", note: "An exposed iron column in a bourgeois drawing room, growing tendrils — the moment Art Nouveau became a building rather than a pattern." },
  { w: "Secession_Building", n: "Secession Building", a: "Joseph Maria Olbrich", y: "1898", p: "Vienna, Austria", s: "Vienna Secession", f: "dome", note: "White cube, gilded laurel dome, and a motto over the door promising every age its own art." },
  { w: "Flatiron_Building", n: "Flatiron Building", a: "Daniel Burnham", y: "1902", p: "New York City", s: "Beaux-Arts", f: "tower", note: "Two metres wide at the point, and it made a wind tunnel famous enough that police had to shoo away the men who came to watch." },
  { w: "Beurs_van_Berlage", n: "Beurs van Berlage", a: "Hendrik Petrus Berlage", y: "1903", p: "Amsterdam, Netherlands", s: "Modern", f: "slab", note: "Berlage stripped the ornament off Dutch brick and let the wall itself be the architecture — the hinge into modernism." },
  { w: "Casa_Batlló", n: "Casa Batlló", a: "Antoni Gaudí", y: "1906", p: "Barcelona, Spain", s: "Modernisme", f: "curve", note: "Gaudí graded the light well from deep blue at the top to pale at the bottom so every floor gets the same brightness." },
  { w: "Glasgow_School_of_Art", n: "Glasgow School of Art", a: "Charles Rennie Mackintosh", y: "1909", p: "Glasgow, Scotland", s: "Modern", f: "slab", note: "Mackintosh was 28 when he won it: enormous north studio windows on a tight budget, with everything else spent on the library." },
  { w: "Robie_House", n: "Robie House", a: "Frank Lloyd Wright", y: "1910", p: "Chicago, Illinois", s: "Prairie School", f: "slab", note: "Cantilevered roofs run six metres past their supports, and the whole house is organised around a hearth instead of a hall." },
  { w: "Looshaus", n: "Looshaus", a: "Adolf Loos", y: "1911", p: "Vienna, Austria", s: "Modern", f: "slab", note: "The bare upper facade so offended Vienna that the emperor reportedly kept his palace curtains shut against it." },
  { w: "Fagus_Factory", n: "Fagus Factory", a: "Walter Gropius and Adolf Meyer", y: "1911", p: "Alfeld, Germany", s: "Modern", f: "slab", note: "Glass turns the corner with no column behind it — a small structural joke that announced the entire glass curtain wall." },
  { w: "Casa_Milà", n: "Casa Milà", a: "Antoni Gaudí", y: "1912", p: "Barcelona, Spain", s: "Modernisme", f: "curve", note: "No straight walls and no load-bearing partitions, so every apartment plan could be redrawn at will — in 1912." },
  { w: "Woolworth_Building", n: "Woolworth Building", a: "Cass Gilbert", y: "1913", p: "New York City", s: "Neo-Gothic", f: "tower", note: "A Gothic cathedral 241 metres tall, paid for in cash by a man who sold everything for five and ten cents." },
  { w: "Einstein_Tower", n: "Einstein Tower", a: "Erich Mendelsohn", y: "1921", p: "Potsdam, Germany", s: "Expressionism", f: "curve", note: "Designed to be poured concrete, built mostly in rendered brick because nobody could yet form those curves." },
  { w: "Shukhov_Tower", n: "Shukhov Tower", a: "Vladimir Shukhov", y: "1922", p: "Moscow, Russia", s: "Constructivism", f: "tower", note: "Shukhov invented the hyperboloid lattice — straight steel members assembled into a double curve, using a third of the expected steel." },
  { w: "Rietveld_Schröder_House", n: "Rietveld Schröder House", a: "Gerrit Rietveld", y: "1924", p: "Utrecht, Netherlands", s: "De Stijl", f: "slab", note: "The entire upper floor is one room until sliding panels divide it — the open plan, built as a demonstration." },
  { w: "Bauhaus_Dessau", n: "Bauhaus Dessau", a: "Walter Gropius", y: "1926", p: "Dessau, Germany", s: "Bauhaus", f: "slab", note: "A pinwheel plan with no single front, meant to be understood by walking around it or seeing it from the air." },
  { w: "Stockholm_Public_Library", n: "Stockholm Public Library", a: "Gunnar Asplund", y: "1928", p: "Stockholm, Sweden", s: "Nordic Classicism", f: "dome", note: "A cylinder dropped into a box, with the books ringing the walls so the whole collection is visible from the middle." },
  { w: "Melnikov_House", n: "Melnikov House", a: "Konstantin Melnikov", y: "1929", p: "Moscow, Russia", s: "Constructivism", f: "curve", note: "Two interlocking brick cylinders punched with sixty hexagonal windows — a private house built in Stalin's Moscow, and survived." },
  { w: "Barcelona_Pavilion", n: "Barcelona Pavilion", a: "Ludwig Mies van der Rohe", y: "1929", p: "Barcelona, Spain", s: "Modernism", f: "slab", note: "Walls that only divide and never carry, in onyx and travertine; demolished after six months and rebuilt because it mattered too much." },
  { w: "Chrysler_Building", n: "Chrysler Building", a: "William Van Alen", y: "1930", p: "New York City", s: "Art Deco", f: "tower", note: "The spire was assembled in secret inside the shaft and raised in 90 minutes to steal the height record mid-race." },
  { w: "Villa_Tugendhat", n: "Villa Tugendhat", a: "Ludwig Mies van der Rohe", y: "1930", p: "Brno, Czechia", s: "Modernism", f: "slab", note: "A plate-glass wall that sinks into the floor at the touch of a motor, in 1930, so the living room opens to the garden." },
  { w: "Narkomfin_building", n: "Narkomfin Building", a: "Moisei Ginzburg and Ignaty Milinis", y: "1930", p: "Moscow, Russia", s: "Constructivism", f: "slab", note: "Interlocking split-level flats sharing a corridor every three floors — the section Le Corbusier borrowed for Marseille." },
  { w: "Empire_State_Building", n: "Empire State Building", a: "Shreve, Lamb and Harmon", y: "1931", p: "New York City", s: "Art Deco", f: "tower", note: "Built in 410 days at a rate of four and a half floors a week, and finished under budget in the middle of the Depression." },
  { w: "Villa_Savoye", n: "Villa Savoye", a: "Le Corbusier", y: "1931", p: "Poissy, France", s: "Modernism", f: "slab", note: "All five of Le Corbusier's points in one object — and it leaked so badly the client threatened to sue." },
  { w: "Van_Nelle_Factory", n: "Van Nelle Factory", a: "Brinkman and Van der Vlugt", y: "1931", p: "Rotterdam, Netherlands", s: "Modernism", f: "slab", note: "A factory built as a glass box on mushroom columns, on the argument that daylight and view were owed to workers." },
  { w: "Paimio_Sanatorium", n: "Paimio Sanatorium", a: "Alvar Aalto", y: "1933", p: "Paimio, Finland", s: "Modernism", f: "slab", note: "Aalto designed the ceilings, the taps and the washbasins for people lying down — a building shaped around the patient's line of sight." },
  { w: "Casa_del_Fascio", n: "Casa del Fascio", a: "Giuseppe Terragni", y: "1936", p: "Como, Italy", s: "Italian Rationalism", f: "slab", note: "A perfect half-cube whose facade is a grid you can read the structure through — brilliant architecture in service of fascism." },
  { w: "Fallingwater", n: "Fallingwater", a: "Frank Lloyd Wright", y: "1939", p: "Mill Run, Pennsylvania", s: "Organic", f: "slab", note: "Wright put the house over the waterfall instead of facing it, and the engineer's extra reinforcement is the only reason it stands." },
  { w: "Johnson_Wax_Headquarters", n: "Johnson Wax Headquarters", a: "Frank Lloyd Wright", y: "1939", p: "Racine, Wisconsin", s: "Organic", f: "slab", note: "Wright loaded a test column with twelve tonnes to prove his lily-pad columns were legal, then built a room full of them." },
  { w: "Villa_Mairea", n: "Villa Mairea", a: "Alvar Aalto", y: "1939", p: "Noormarkku, Finland", s: "Modernism", f: "slab", note: "Aalto scattered slender columns through the plan in bundles, so walking through the house feels like walking through a birch wood." },
  { w: "Skogskyrkogården", n: "Woodland Cemetery", a: "Gunnar Asplund and Sigurd Lewerentz", y: "1940", p: "Stockholm, Sweden", s: "Nordic Modernism", f: "slab", note: "Landscape doing the architecture's job: a grass hill, a stand of trees, and a portico placed exactly where grief needs to pause." },
  { w: "Grundtvig's_Church", n: "Grundtvig's Church", a: "Peder Vilhelm Jensen-Klint", y: "1940", p: "Copenhagen, Denmark", s: "Expressionist", f: "spire", note: "Six million yellow bricks, all the same brick, laid by hand into a Gothic cathedral shaped like a church organ." },
  { w: "Kaufmann_Desert_House", n: "Kaufmann Desert House", a: "Richard Neutra", y: "1946", p: "Palm Springs, California", s: "Mid-century Modern", f: "slab", note: "A pinwheel of glass pavilions in the desert with movable louvres — the same client who commissioned Fallingwater." },
  { w: "Luis_Barragán_House_and_Studio", n: "Barragán House and Studio", a: "Luis Barragán", y: "1948", p: "Mexico City, Mexico", s: "Mexican Modernism", f: "slab", note: "Barragán kept the street facade blank and saved everything for inside: pink, ochre, a floating stair with no railing." },
  { w: "Glass_House_(New_Canaan,_Connecticut)", n: "Glass House", a: "Philip Johnson", y: "1949", p: "New Canaan, Connecticut", s: "Modernism", f: "slab", note: "Utterly transparent except for one brick cylinder holding the bathroom and the fireplace — the only privacy in the building." },
  { w: "Eames_House", n: "Eames House", a: "Charles and Ray Eames", y: "1949", p: "Los Angeles, California", s: "Case Study", f: "slab", note: "Assembled from off-the-shelf industrial catalogue parts in a few days, then filled with a lifetime of objects." },
  { w: "Farnsworth_House", n: "Farnsworth House", a: "Ludwig Mies van der Rohe", y: "1951", p: "Plano, Illinois", s: "Modernism", f: "slab", note: "Eight steel columns, two floating planes, and a lawsuit — the client sued over the cost and the impossibility of living in it." },
  { w: "Lever_House", n: "Lever House", a: "Gordon Bunshaft (SOM)", y: "1952", p: "New York City", s: "International Style", f: "slab", note: "The first glass curtain-wall tower on Park Avenue, and it gave away its ground floor as public plaza to get there." },
  { w: "Unité_d'habitation", n: "Unité d'Habitation", a: "Le Corbusier", y: "1952", p: "Marseille, France", s: "Brutalism", f: "slab", note: "337 apartments interlocking like a wine rack, with a shopping street halfway up and a running track on the roof." },
  { w: "Säynätsalo_Town_Hall", n: "Säynätsalo Town Hall", a: "Alvar Aalto", y: "1952", p: "Säynätsalo, Finland", s: "Modernism", f: "slab", note: "A civic building for 3,000 people, entered by climbing a grass staircase to a raised brick courtyard." },
  { w: "Notre-Dame_du_Haut", n: "Notre-Dame du Haut", a: "Le Corbusier", y: "1955", p: "Ronchamp, France", s: "Modernism", f: "curve", note: "Le Corbusier the rationalist abandoning the grid entirely: a sagging roof, a curved wall, and windows splayed into deep coloured funnels." },
  { w: "S._R._Crown_Hall", n: "Crown Hall", a: "Ludwig Mies van der Rohe", y: "1956", p: "Chicago, Illinois", s: "Modernism", f: "slab", note: "One column-free room 67 metres long, hung from four exterior plate girders — Mies teaching architecture inside his own argument." },
  { w: "Torre_Velasca", n: "Torre Velasca", a: "BBPR", y: "1958", p: "Milan, Italy", s: "Postwar Italian", f: "tower", note: "A tower that flares out at the top on visible struts, quoting a medieval Lombard watchtower and infuriating the modernists." },
  { w: "Pirelli_Tower", n: "Pirelli Tower", a: "Gio Ponti and Pier Luigi Nervi", y: "1958", p: "Milan, Italy", s: "Modernism", f: "tower", note: "Ponti tapered the plan to a point at both ends so the tower reads as a thin blade from every angle." },
  { w: "Seagram_Building", n: "Seagram Building", a: "Ludwig Mies van der Rohe and Philip Johnson", y: "1958", p: "New York City", s: "International Style", f: "tower", note: "The bronze I-beams on the outside are decoration — fireproofing law hid the real steel, so Mies expressed it in effigy." },
  { w: "Torres_de_Satélite", n: "Torres de Satélite", a: "Luis Barragán and Mathias Goeritz", y: "1958", p: "Naucalpan, Mexico", s: "Emotional Architecture", f: "tower", note: "Five coloured concrete prisms up to 52 metres tall, designed to be understood at speed from a moving car." },
  { w: "Louisiana_Museum_of_Modern_Art", n: "Louisiana Museum of Modern Art", a: "Jørgen Bo and Vilhelm Wohlert", y: "1958", p: "Humlebæk, Denmark", s: "Danish Modernism", f: "slab", note: "Glazed corridors thread between old trees, so the walk between galleries is as composed as the galleries." },
  { w: "Solomon_R._Guggenheim_Museum", n: "Guggenheim Museum", a: "Frank Lloyd Wright", y: "1959", p: "New York City", s: "Organic", f: "curve", note: "Wright wanted visitors carried to the top and walked down a single continuous ramp; the artists objected to the sloping floor and lost." },
  { w: "Sainte_Marie_de_La_Tourette", n: "Sainte Marie de La Tourette", a: "Le Corbusier and Iannis Xenakis", y: "1960", p: "Éveux, France", s: "Brutalism", f: "slab", note: "Xenakis, a composer, spaced the window mullions to a musical rhythm — the glazing is scored rather than drawn." },
  { w: "Stahl_House", n: "Stahl House", a: "Pierre Koenig", y: "1960", p: "Los Angeles, California", s: "Case Study", f: "slab", note: "A steel-and-glass L cantilevered over a hillside nobody would lend against — and now the most photographed house in America." },
  { w: "TWA_Flight_Center", n: "TWA Flight Center", a: "Eero Saarinen", y: "1962", p: "New York City", s: "Neo-Futurism", f: "curve", note: "Four concrete shells barely touching, with no straight line anywhere — even the departure boards were curved to match." },
  { w: "Chandigarh_Capitol_Complex", n: "Chandigarh Capitol Complex", a: "Le Corbusier", y: "1962", p: "Chandigarh, India", s: "Brutalism", f: "slab", note: "Concrete monuments sized for the Himalayan foothills behind them, built for a country that had just lost its old capital." },
  { w: "Marina_City", n: "Marina City", a: "Bertrand Goldberg", y: "1964", p: "Chicago, Illinois", s: "Modernism", f: "tower", note: "Two concrete corncobs of pie-slice apartments over a spiral car park — an argument that downtown could still be lived in." },
  { w: "Yoyogi_National_Gymnasium", n: "Yoyogi National Gymnasium", a: "Kenzō Tange", y: "1964", p: "Tokyo, Japan", s: "Structural Expressionism", f: "curve", note: "A roof hung from steel cables like a suspension bridge, sweeping into two curved tails for the 1964 Olympics." },
  { w: "Salk_Institute_for_Biological_Studies", n: "Salk Institute", a: "Louis Kahn", y: "1965", p: "La Jolla, California", s: "Brutalism", f: "slab", note: "Kahn gave every lab an entire service floor above it, then left the courtyard empty except for a channel of water toward the Pacific." },
  { w: "Gateway_Arch", n: "Gateway Arch", a: "Eero Saarinen", y: "1965", p: "St. Louis, Missouri", s: "Structural Expressionism", f: "arch", note: "A weighted catenary 192 metres tall; the final section only fit because firefighters cooled one leg with hoses." },
  { w: "Markuskyrkan", n: "Markuskyrkan", a: "Sigurd Lewerentz", y: "1960", p: "Stockholm, Sweden", s: "Late Modernism", f: "slab", note: "Dark brick inside and out with joints left deliberately coarse, in a church Lewerentz set low among the pines so it barely clears the ground." },
  { w: "Habitat_67", n: "Habitat 67", a: "Moshe Safdie", y: "1967", p: "Montreal, Canada", s: "Brutalism", f: "slab", note: "354 identical prefabricated boxes stacked so that each roof is somebody's garden — Safdie's student thesis, actually built." },
  { w: "Montreal_Biosphere", n: "Montreal Biosphere", a: "Buckminster Fuller", y: "1967", p: "Montreal, Canada", s: "Geodesic", f: "dome", note: "A 76-metre geodesic sphere with motorised shading panels; the acrylic skin burned off in 1976 and the frame simply stayed." },
  { w: "Boston_City_Hall", n: "Boston City Hall", a: "Kallmann McKinnell and Knowles", y: "1968", p: "Boston, Massachusetts", s: "Brutalism", f: "slab", note: "The most hated and most defended building in Boston: the parts the public uses are pushed out of the facade in concrete." },
  { w: "875_North_Michigan_Avenue", n: "John Hancock Center", a: "Fazlur Rahman Khan (SOM)", y: "1969", p: "Chicago, Illinois", s: "Structural Expressionism", f: "tower", note: "Khan's cross-braced tube let the tower use half the steel of a conventional frame — and the X-braces became the elevation." },
  { w: "Cathedral_of_Brasília", n: "Cathedral of Brasília", a: "Oscar Niemeyer", y: "1970", p: "Brasília, Brazil", s: "Modernism", f: "curve", note: "Sixteen identical concrete ribs, entered through a dark tunnel so the glass interior hits you all at once." },
  { w: "Geisel_Library", n: "Geisel Library", a: "William Pereira", y: "1970", p: "San Diego, California", s: "Brutalism", f: "curve", note: "Glass and concrete floors cantilevered outward in steps, so the whole library appears to be held up by a pair of hands." },
  { w: "Nakagin_Capsule_Tower", n: "Nakagin Capsule Tower", a: "Kisho Kurokawa", y: "1972", p: "Tokyo, Japan", s: "Metabolism", f: "tower", note: "140 capsules bolted to two cores, meant to be swapped every 25 years. Not one ever was, and it came down in 2022." },
  { w: "Kimbell_Art_Museum", n: "Kimbell Art Museum", a: "Louis Kahn", y: "1972", p: "Fort Worth, Texas", s: "Modernism", f: "arch", note: "Kahn slotted a reflector under each cycloid vault so daylight hits the concrete first and reaches the paintings second-hand." },
  { w: "Trellick_Tower", n: "Trellick Tower", a: "Ernő Goldfinger", y: "1972", p: "London, England", s: "Brutalism", f: "tower", note: "The lift and service tower is split off and bridged every three floors, which is why the silhouette is unmistakable." },
  { w: "Olympiastadion_(Munich)", n: "Munich Olympic Stadium", a: "Frei Otto and Günther Behnisch", y: "1972", p: "Munich, Germany", s: "Tensile", f: "curve", note: "Otto found the roof's shape with soap-film models, then had it computed — one of the first buildings that needed a computer to exist." },
  { w: "Willis_Tower", n: "Willis Tower", a: "Fazlur Rahman Khan (SOM)", y: "1973", p: "Chicago, Illinois", s: "Structural Expressionism", f: "tower", note: "Nine square tubes bundled together, dropping away at different heights — the tallest building on earth for 25 years." },
  { w: "Sydney_Opera_House", n: "Sydney Opera House", a: "Jørn Utzon", y: "1973", p: "Sydney, Australia", s: "Expressionist Modernism", f: "curve", note: "The shells were unbuildable until Utzon cut them all from the surface of one sphere; he resigned before it opened and never returned." },
  { w: "Barbican_Estate", n: "Barbican Estate", a: "Chamberlin, Powell and Bon", y: "1976", p: "London, England", s: "Brutalism", f: "tower", note: "The concrete was hammered by hand, pick by pick, after it cured — 2,000 flats' worth of deliberately roughened surface." },
  { w: "Royal_National_Theatre", n: "National Theatre", a: "Denys Lasdun", y: "1976", p: "London, England", s: "Brutalism", f: "slab", note: "Lasdun called them strata: layered terraces meant to read as a public landscape on the Thames rather than a building." },
  { w: "Bagsværd_Church", n: "Bagsværd Church", a: "Jørn Utzon", y: "1976", p: "Copenhagen, Denmark", s: "Late Modernism", f: "slab", note: "A plain prefabricated shed outside; inside, a concrete ceiling that rolls overhead like the clouds Utzon sketched on a beach." },
  { w: "Centre_Pompidou", n: "Centre Pompidou", a: "Renzo Piano and Richard Rogers", y: "1977", p: "Paris, France", s: "High-tech", f: "slab", note: "Structure and ducts moved to the outside — colour-coded — to leave every floor inside completely free. The architects were in their thirties." },
  { w: "Yale_Center_for_British_Art", n: "Yale Center for British Art", a: "Louis Kahn", y: "1977", p: "New Haven, Connecticut", s: "Modernism", f: "slab", note: "Kahn's last building: matte steel and glass outside, and inside, oak, travertine and light coming down through the roof." },
  { w: "Sainsbury_Centre_for_Visual_Arts", n: "Sainsbury Centre", a: "Norman Foster", y: "1978", p: "Norwich, England", s: "High-tech", f: "slab", note: "A single aircraft-hangar shed where all the services live inside the thick walls, leaving one uninterrupted room." },
  { w: "Piazza_d'Italia_(New_Orleans)", n: "Piazza d'Italia", a: "Charles Moore", y: "1978", p: "New Orleans, Louisiana", s: "Postmodernism", f: "columns", note: "The classical orders rebuilt in neon and stainless steel around a fountain shaped like Italy — postmodernism at its most cheerful." },
  { w: "Palace_of_Westminster", n: "Palace of Westminster", a: "Charles Barry and A. W. N. Pugin", y: "1876", p: "London, England", s: "Gothic Revival", f: "spire", note: "Barry laid out a ruthlessly rational plan and Pugin drew the Gothic over every inch of it, down to the inkwells and the coat hooks." },
  { w: "Portland_Building", n: "Portland Building", a: "Michael Graves", y: "1982", p: "Portland, Oregon", s: "Postmodernism", f: "slab", note: "Colour, garlands and a keystone on a public office block — the building that made postmodernism a mainstream fight." },
  { w: "Jatiya_Sangsad_Bhaban", n: "National Assembly of Bangladesh", a: "Louis Kahn", y: "1982", p: "Dhaka, Bangladesh", s: "Brutalism", f: "slab", note: "Kahn cut vast circles and triangles out of the concrete walls for light and air; construction continued straight through a war." },
  { w: "Neue_Staatsgalerie", n: "Neue Staatsgalerie", a: "James Stirling", y: "1984", p: "Stuttgart, Germany", s: "Postmodernism", f: "dome", note: "A public footpath runs right through the museum's drum, so the city walks through the building without paying." },
  { w: "550_Madison_Avenue", n: "AT&T Building", a: "Philip Johnson and John Burgee", y: "1984", p: "New York City", s: "Postmodernism", f: "tower", note: "A granite skyscraper topped with a broken pediment lifted off a Chippendale cabinet — the joke that ended late modernism." },
  { w: "HSBC_Building_(Hong_Kong)", n: "HSBC Main Building", a: "Norman Foster", y: "1985", p: "Hong Kong", s: "High-tech", f: "tower", note: "Floors hung from masts so the ground could stay open, and a mirrored scoop on the roof pushing sunlight down into the atrium." },
  { w: "Lloyd's_building", n: "Lloyd's Building", a: "Richard Rogers", y: "1986", p: "London, England", s: "High-tech", f: "tower", note: "Twelve glass lifts and every pipe on the outside, so the trading floor inside could be re-planned forever." },
  { w: "Vitra_Design_Museum", n: "Vitra Design Museum", a: "Frank Gehry", y: "1989", p: "Weil am Rhein, Germany", s: "Deconstructivism", f: "tower", note: "Gehry's first European building: white plaster forms colliding, small enough that the whole idea fits in one glance." },
  { w: "Church_of_the_Light", n: "Church of the Light", a: "Tadao Ando", y: "1989", p: "Ibaraki, Japan", s: "Minimalism", f: "slab", note: "A cross cut clean through a concrete wall, built on almost no budget; for years there was no glass in the slot at all." },
  { w: "Louvre_Pyramid", n: "Louvre Pyramid", a: "I. M. Pei", y: "1989", p: "Paris, France", s: "Modernism", f: "pyramid", note: "France went to war over it, then kept it. The glass was made specially so it would read as clear rather than green." },
  { w: "Bank_of_China_Tower_(Hong_Kong)", n: "Bank of China Tower", a: "I. M. Pei", y: "1990", p: "Hong Kong", s: "Structural Expressionism", f: "tower", note: "Four triangular prisms rising to different heights, braced so the tower needed half the usual steel in a typhoon zone." },
  { w: "Vitra_Fire_Station", n: "Vitra Fire Station", a: "Zaha Hadid", y: "1993", p: "Weil am Rhein, Germany", s: "Deconstructivism", f: "tower", note: "Hadid's first completed building, at 42: sharp concrete planes with no right angles and no vertical you can trust." },
  { w: "Dancing_House", n: "Dancing House", a: "Frank Gehry and Vlado Milunić", y: "1996", p: "Prague, Czechia", s: "Deconstructivism", f: "tower", note: "Two towers leaning into each other on a wartime bomb site, nicknamed after Fred Astaire and Ginger Rogers." },
  { w: "Therme_Vals", n: "Therme Vals", a: "Peter Zumthor", y: "1996", p: "Vals, Switzerland", s: "Minimalism", f: "slab", note: "60,000 slabs of local quarry stone laid in bands, and a plan you navigate by sound and temperature rather than signs." },
  { w: "Niterói_Contemporary_Art_Museum", n: "Niterói Contemporary Art Museum", a: "Oscar Niemeyer", y: "1996", p: "Niterói, Brazil", s: "Modernism", f: "curve", note: "Niemeyer at 89, balancing a saucer on a single stem above the bay — the view out is arguably the exhibit." },
  { w: "Kunsthaus_Bregenz", n: "Kunsthaus Bregenz", a: "Peter Zumthor", y: "1997", p: "Bregenz, Austria", s: "Minimalism", f: "slab", note: "Etched glass shingles hang free of the concrete box behind, so the whole building glows with whatever the lake is doing." },
  { w: "Guggenheim_Museum_Bilbao", n: "Guggenheim Bilbao", a: "Frank Gehry", y: "1997", p: "Bilbao, Spain", s: "Deconstructivism", f: "tower", note: "Titanium panels 0.38 mm thick, drawn in aerospace software, and a city's economy visibly rebuilt around one building." },
  { w: "Chapel_of_St._Ignatius", n: "Chapel of St. Ignatius", a: "Steven Holl", y: "1997", p: "Seattle, Washington", s: "Contemporary", f: "slab", note: "Holl called it seven bottles of light in a stone box — each roof scoop catches a different colour for a different part of the liturgy." },
  { w: "Petronas_Towers", n: "Petronas Towers", a: "César Pelli", y: "1998", p: "Kuala Lumpur, Malaysia", s: "Postmodernism", f: "tower", note: "The plan is an Islamic eight-pointed star; the two towers were built by rival contractors racing each other upward." },
  { w: "City_of_Arts_and_Sciences", n: "City of Arts and Sciences", a: "Santiago Calatrava", y: "1998", p: "Valencia, Spain", s: "Neo-Futurism", f: "curve", note: "Built in a drained riverbed after a flood, in white concrete and broken tile — skeletal, and wildly over budget." },
  { w: "Reichstag_building", n: "Reichstag Dome", a: "Norman Foster", y: "1999", p: "Berlin, Germany", s: "High-tech", f: "dome", note: "The public walks a spiral ramp above the debating chamber — citizens literally placed over their parliament." },
  { w: "Tate_Modern", n: "Tate Modern", a: "Herzog & de Meuron", y: "2000", p: "London, England", s: "Contemporary", f: "tower", note: "They won by proposing to keep the power station almost as found, and to leave the turbine hall gloriously, uselessly empty." },
  { w: "Sendai_Mediatheque", n: "Sendai Mediatheque", a: "Toyo Ito", y: "2001", p: "Sendai, Japan", s: "Contemporary", f: "slab", note: "Thirteen hollow lattice tubes of steel replace all columns, walls and shafts. It rode out the 2011 earthquake." },
  { w: "Milwaukee_Art_Museum", n: "Milwaukee Art Museum", a: "Santiago Calatrava", y: "2001", p: "Milwaukee, Wisconsin", s: "Neo-Futurism", f: "curve", note: "A 90-tonne sunscreen with a 66-metre wingspan that opens each morning and folds down in high wind." },
  { w: "Jewish_Museum,_Berlin", n: "Jewish Museum Berlin", a: "Daniel Libeskind", y: "2001", p: "Berlin, Germany", s: "Deconstructivism", f: "tower", note: "Voids you cannot enter cut straight through the plan; 350,000 people visited before a single exhibit was installed." },
  { w: "Bibliotheca_Alexandrina", n: "Bibliotheca Alexandrina", a: "Snøhetta", y: "2002", p: "Alexandria, Egypt", s: "Contemporary", f: "curve", note: "A tilted granite disc rising out of the ground like a second sun, its wall carved with characters from every writing system." },
  { w: "Walt_Disney_Concert_Hall", n: "Walt Disney Concert Hall", a: "Frank Gehry", y: "2003", p: "Los Angeles, California", s: "Deconstructivism", f: "tower", note: "Sixteen years from commission to opening, and one polished panel had to be sanded down for cooking the pavement across the street." },
  { w: "Seattle_Central_Library", n: "Seattle Central Library", a: "Rem Koolhaas (OMA)", y: "2004", p: "Seattle, Washington", s: "Contemporary", f: "curve", note: "The whole non-fiction collection sits on one continuous four-storey ramp, so the Dewey system never needs re-shelving between floors." },
  { w: "21st_Century_Museum_of_Contemporary_Art,_Kanazawa", n: "21st Century Museum", a: "SANAA", y: "2004", p: "Kanazawa, Japan", s: "Contemporary", f: "curve", note: "A glass circle with no front and no back, so people cut through it on their way somewhere else." },
  { w: "30_St_Mary_Axe", n: "30 St Mary Axe", a: "Norman Foster", y: "2004", p: "London, England", s: "High-tech", f: "tower", note: "The bulge and the taper are aerodynamic, and only one pane of glass on the whole tower is actually curved." },
  { w: "Chichu_Art_Museum", n: "Chichu Art Museum", a: "Tadao Ando", y: "2004", p: "Naoshima, Japan", s: "Minimalism", f: "slab", note: "Built entirely underground to spare the island's skyline, and lit only by daylight — so the art changes hour by hour." },
  { w: "Casa_da_Música", n: "Casa da Música", a: "Rem Koolhaas (OMA)", y: "2005", p: "Porto, Portugal", s: "Contemporary", f: "slab", note: "A faceted concrete meteor with a shoebox concert hall cut through it, glazed at both ends so the city is the backdrop." },
  { w: "Suzhou_Museum", n: "Suzhou Museum", a: "I. M. Pei", y: "2006", p: "Suzhou, China", s: "Contemporary", f: "pagoda", note: "Pei, at 85, building in the city his family came from — a classical garden abstracted into white walls and grey edges." },
  { w: "New_Museum", n: "New Museum", a: "SANAA", y: "2007", p: "New York City", s: "Contemporary", f: "tower", note: "Six boxes stacked off-centre, wrapped in aluminium mesh — the shifts are what let daylight into a mid-block site." },
  { w: "Kolumba", n: "Kolumba", a: "Peter Zumthor", y: "2007", p: "Cologne, Germany", s: "Contemporary", f: "slab", note: "Built straight onto the ruins of a bombed Gothic church, with a perforated grey brick wall that lets daylight and air drift through the excavation below." },
  { w: "Beijing_National_Stadium", n: "Beijing National Stadium", a: "Herzog & de Meuron with Ai Weiwei", y: "2008", p: "Beijing, China", s: "Contemporary", f: "curve", note: "The steel lattice was structure and facade at once, wrapped around a bowl it does not touch." },
  { w: "Oslo_Opera_House", n: "Oslo Opera House", a: "Snøhetta", y: "2008", p: "Oslo, Norway", s: "Contemporary", f: "curve", note: "The roof is a public plaza you can walk up from the fjord — 36,000 marble pieces, all cut to slightly different sizes." },
  { w: "High_Line", n: "High Line", a: "Diller Scofidio + Renfro and James Corner", y: "2009", p: "New York City", s: "Landscape", f: "arch", note: "A derelict freight viaduct kept exactly where it was, replanted with the weeds that had already colonised it." },
  { w: "Burj_Khalifa", n: "Burj Khalifa", a: "Adrian Smith (SOM)", y: "2010", p: "Dubai, UAE", s: "Neo-Futurism", f: "tower", note: "A Y-shaped buttressed core that steps back 27 times on the way up, breaking the wind before it can organise into a vortex." },
  { w: "Rolex_Learning_Center", n: "Rolex Learning Center", a: "SANAA", y: "2010", p: "Lausanne, Switzerland", s: "Contemporary", f: "curve", note: "One continuous floor slab that rolls into hills and valleys, so the building has no stairs and almost no walls." },
  { w: "MAXXI", n: "MAXXI", a: "Zaha Hadid", y: "2010", p: "Rome, Italy", s: "Contemporary", f: "curve", note: "Hadid described it as a field of galleries rather than an object — the circulation is the building, and it refuses to end anywhere." },
  { w: "Museo_Soumaya", n: "Museo Soumaya", a: "Fernando Romero", y: "2011", p: "Mexico City, Mexico", s: "Contemporary", f: "curve", note: "16,000 hexagonal aluminium tiles on a twisting anticlastic shell with no windows at all — light comes from the top." },
  { w: "CCTV_Headquarters", n: "CCTV Headquarters", a: "Rem Koolhaas and Ole Scheeren (OMA)", y: "2012", p: "Beijing, China", s: "Contemporary", f: "arch", note: "A continuous loop through six horizontal and vertical sections; the two towers were built leaning apart and joined at dawn, when the steel was coldest." },
  { w: "Heydar_Aliyev_Center", n: "Heydar Aliyev Center", a: "Zaha Hadid", y: "2012", p: "Baku, Azerbaijan", s: "Contemporary", f: "curve", note: "The surface never breaks — wall becomes roof becomes floor, held up by a space frame doing all the work out of sight." },
  { w: "Elbphilharmonie", n: "Elbphilharmonie", a: "Herzog & de Meuron", y: "2017", p: "Hamburg, Germany", s: "Contemporary", f: "curve", note: "A glass wave on a 1960s warehouse, with 10,000 individually milled gypsum panels shaping the sound of the main hall." },
  { w: "Great_Mosque_of_Djenné", n: "Great Mosque of Djenné", a: "Ismaila Traoré and the masons of Djenné", y: "1907", p: "Djenné, Mali", s: "Sudano-Sahelian", f: "spire", note: "The largest mud-brick building on earth, replastered every year by the whole town in a single day's work." },
  { w: "Zeitz_Museum_of_Contemporary_Art_Africa", n: "Zeitz MOCAA", a: "Heatherwick Studio", y: "2017", p: "Cape Town, South Africa", s: "Contemporary", f: "curve", note: "Forty-two concrete grain silos hollowed out around the shape of a single enlarged corn kernel, cutting an atrium out of solid industry." },
  { w: "Hallgrímskirkja", n: "Hallgrímskirkja", a: "Guðjón Samúelsson", y: "1986", p: "Reykjavík, Iceland", s: "Expressionist", f: "spire", note: "The stepped flanks are basalt columns translated into concrete; it took 41 years to build a church out of Icelandic geology." },
  { w: "Kiasma", n: "Kiasma", a: "Steven Holl", y: "1998", p: "Helsinki, Finland", s: "Contemporary", f: "curve", note: "Holl bent the plan around the low northern sun, so the galleries curve to catch light that never gets high in the sky." },
  { w: "Zollverein_Coal_Mine_Industrial_Complex", n: "Zollverein Coal Mine", a: "Fritz Schupp and Martin Kremmer", y: "1932", p: "Essen, Germany", s: "Bauhaus industrial", f: "tower", note: "A coal mine designed to Bauhaus proportions, then handed to Rem Koolhaas and OMA sixty years later as a cultural quarter." },
  { w: "National_Congress_of_Brazil", n: "National Congress of Brazil", a: "Oscar Niemeyer", y: "1960", p: "Brasília, Brazil", s: "Modernism", f: "dome", note: "A dome for the Senate, a bowl for the Chamber of Deputies — the constitution rendered as two curves on a plinth." },
  { w: "Palácio_da_Alvorada", n: "Palácio da Alvorada", a: "Oscar Niemeyer", y: "1958", p: "Brasília, Brazil", s: "Modernism", f: "columns", note: "The colonnade Niemeyer said was the whole point: a curve that touches the ground so lightly it became the city's symbol." },
  { w: "Château_de_Chambord", n: "Château de Chambord", a: "Domenico da Cortona (Leonardo da Vinci attributed)", y: "1547", p: "Loir-et-Cher, France", s: "French Renaissance", f: "spire", note: "The central staircase is a double helix: two spirals around one open core, so two people can climb it and never meet." },
  { w: "Taliesin_West", n: "Taliesin West", a: "Frank Lloyd Wright", y: "1937", p: "Scottsdale, Arizona", s: "Organic", f: "slab", note: "Built from desert rocks set in concrete by Wright's own apprentices, and reworked by him every winter for twenty years." },
  { w: "Vanna_Venturi_House", n: "Vanna Venturi House", a: "Robert Venturi", y: "1964", p: "Philadelphia, Pennsylvania", s: "Postmodernism", f: "slab", note: "A house for his mother with a split gable and a chimney where the peak should be — five rooms that started an argument still running." },
  { w: "Rockefeller_Center", n: "Rockefeller Center", a: "Raymond Hood", y: "1939", p: "New York City", s: "Art Deco", f: "tower", note: "Fourteen buildings planned around a sunken plaza nobody wanted, which turned out to be the best public space in Manhattan." },
  { w: "Sagrada_Família", n: "Sagrada Família", a: "Antoni Gaudí", y: "1882–", p: "Barcelona, Spain", s: "Modernisme", f: "spire", note: "Gaudí worked it out with upside-down models weighted with sandbags; 140 years later the computers are still catching up." },
  { w: "Park_Güell", n: "Park Güell", a: "Antoni Gaudí", y: "1914", p: "Barcelona, Spain", s: "Modernisme", f: "curve", note: "A failed housing estate that sold two plots, then became the best public park in Barcelona almost by accident." },
  { w: "Amiens_Cathedral", n: "Amiens Cathedral", a: "Robert de Luzarches", y: "1270", p: "Amiens, France", s: "High Gothic", f: "spire", note: "The tallest complete Gothic vault in France, built fast enough that the whole nave is in one consistent hand." },
  { w: "King's_College_Chapel,_Cambridge", n: "King's College Chapel", a: "John Wastell", y: "1515", p: "Cambridge, England", s: "Perpendicular Gothic", f: "spire", note: "The largest fan vault in the world, 2,000 tonnes of stone spread so thin it behaves more like a shell than a ceiling." },
  { w: "Basilica_of_San_Vitale", n: "Basilica of San Vitale", a: "Byzantine builders", y: "547", p: "Ravenna, Italy", s: "Byzantine", f: "dome", note: "An octagon whose dome is built of interlocking clay pots — light enough that the walls barely had to resist it." },
  { w: "Todai-ji", n: "Tōdai-ji", a: "Emperor Shōmu's builders", y: "752", p: "Nara, Japan", s: "Nara period", f: "pagoda", note: "Rebuilt twice at two-thirds its original width, and still one of the largest wooden buildings ever raised." },
  { w: "Registan", n: "Registan", a: "Timurid builders", y: "1660", p: "Samarkand, Uzbekistan", s: "Timurid", f: "dome", note: "Three madrasas facing one square, tiled in a blue that was the most expensive colour available anywhere on the Silk Road." },
  { w: "Chichen_Itza", n: "El Castillo, Chichén Itzá", a: "Maya builders", y: "c. 1000", p: "Yucatán, Mexico", s: "Maya", f: "pyramid", note: "365 steps, and at the equinox the terrace shadows form a serpent that slides down the northern staircase." },
  { w: "Great_Zimbabwe", n: "Great Zimbabwe", a: "Shona builders", y: "c. 1300", p: "Masvingo, Zimbabwe", s: "Shona", f: "curve", note: "Eleven-metre granite walls laid entirely without mortar, curving so no straight line ever gives the joints away." },
  { w: "Hawa_Mahal", n: "Hawa Mahal", a: "Lal Chand Ustad", y: "1799", p: "Jaipur, India", s: "Rajput", f: "arch", note: "953 small windows built so the women of the court could watch the street unseen — and so the whole facade breathes cool air." },
  { w: "Ise_Grand_Shrine", n: "Ise Grand Shrine", a: "Shinto carpenters", y: "690, rebuilt every 20 years", p: "Ise, Japan", s: "Shinmei-zukuri", f: "pagoda", note: "Torn down and rebuilt on the adjacent site every twenty years since the 7th century — the building is a practice, not an object." }
]

// ---- small helpers -------------------------------------------------------

function pad2(value) {
  var n = Number(value)
  return (n < 10 ? "0" : "") + String(n)
}

function clean(text) {
  return String(text === undefined || text === null ? "" : text).replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "")
}

function boolSetting(value, fallback) {
  if (value === undefined || value === null) return fallback === true
  if (value === true || value === false) return value
  var text = String(value).toLowerCase()
  if (text === "true" || text === "1" || text === "yes") return true
  if (text === "false" || text === "0" || text === "no") return false
  return fallback === true
}

// ---- dates ---------------------------------------------------------------

function dateKeyFromDate(date) {
  var d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ""
  return String(d.getFullYear()) + pad2(d.getMonth() + 1) + pad2(d.getDate())
}

function parseDateKey(key) {
  var s = String(key || "")
  if (!/^\d{8}$/.test(s)) return null
  var d = new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)))
  return isNaN(d.getTime()) ? null : d
}

function shiftDateKey(key, days) {
  var d = parseDateKey(key)
  if (!d) return String(key || "")
  d.setDate(d.getDate() + (parseInt(days, 10) || 0))
  return dateKeyFromDate(d)
}

// Civil day number. Computed through Date.UTC so it is an exact integer and
// never drifts with the machine's timezone — the same date always picks the
// same building, wherever you are.
function dayNumber(key) {
  var s = String(key || "")
  if (!/^\d{8}$/.test(s)) return 0
  var ms = Date.UTC(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)))
  return Math.floor(ms / 86400000)
}

// Inverse of dayNumber, for turning a position in the cycle back into a date.
function dateKeyFromDayNumber(day) {
  var d = new Date(Math.floor(day) * 86400000)
  return String(d.getUTCFullYear()) + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate())
}

function dateHeading(key, todayKey) {
  var current = String(key || "")
  var today = String(todayKey || "")
  if (current && current === today) return "Today"
  if (current && current === shiftDateKey(today, -1)) return "Yesterday"
  if (current && current === shiftDateKey(today, 1)) return "Tomorrow"
  var d = parseDateKey(current)
  if (!d) return current
  var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return days[d.getDay()] + " " + d.getDate() + " " + months[d.getMonth()]
}

// ---- the daily pick ------------------------------------------------------

// Deterministic PRNG. Same seed, same sequence, on every machine and in the
// node tests — nothing here may depend on Math.random.
function seededRandom(seed) {
  var state = (Math.abs(Math.floor(seed)) % 2147483647) >>> 0
  if (state === 0) state = 1
  return function() {
    state = (state * 1103515245 + 12345) >>> 0
    return state / 4294967296
  }
}

// One reshuffled running order per pass through the canon. Every building
// appears exactly once per cycle, and the order differs each time round, so
// there are no repeats for months and no fixed sequence to memorise.
function cycleOrder(cycle, count) {
  var total = Math.max(1, Math.floor(count))
  var order = []
  for (var i = 0; i < total; i++) order.push(i)
  var rand = seededRandom(Math.floor(cycle) * 2654435761 + 40503)
  for (var j = total - 1; j > 0; j--) {
    var k = Math.floor(rand() * (j + 1))
    var swap = order[j]
    order[j] = order[k]
    order[k] = swap
  }
  return order
}

function indexForDay(day, count) {
  var n = Math.floor(count)
  if (!isFinite(n) || n <= 0) return 0
  var d = Math.floor(day)
  var cycle = Math.floor(d / n)
  var pos = ((d % n) + n) % n
  return cycleOrder(cycle, n)[pos]
}

function entryForDateKey(key, list) {
  var buildings = list || BUILDINGS
  if (!buildings.length) return null
  return buildings[indexForDay(dayNumber(key), buildings.length)]
}

// How far into the current pass through the canon this date sits, and how
// many days remain before the deck is reshuffled.
function cyclePosition(key, list) {
  var buildings = list || BUILDINGS
  var n = buildings.length
  if (!n) return { position: 0, total: 0, remaining: 0 }
  var position = ((dayNumber(key) % n) + n) % n + 1
  return { position: position, total: n, remaining: n - position }
}

// "43 of 189 · reshuffle in 146 days"
function cycleLine(position) {
  var p = position || {}
  if (!p.total) return ""
  var line = p.position + " of " + p.total
  if (p.remaining === 0) return line + " · reshuffle tomorrow"
  return line + " · reshuffle in " + p.remaining + (p.remaining === 1 ? " day" : " days")
}

// The day within `fromKey`'s cycle on which building `index` is dealt. This
// is what lets the timeline browse the canon in the order it was built while
// the date heading still says when each one comes round.
function dateKeyForIndex(index, fromKey, list) {
  var n = (list || BUILDINGS).length
  if (!n) return String(fromKey || "")
  var cycle = Math.floor(dayNumber(fromKey) / n)
  var position = cycleOrder(cycle, n).indexOf(Math.floor(index))
  if (position < 0) return String(fromKey || "")
  return dateKeyFromDayNumber(cycle * n + position)
}

// ---- the timeline ----------------------------------------------------------

// A year from the loose strings the canon uses. BC comes out negative and a
// bare century lands in its middle, so the sort is right even if the label
// is approximate.
function yearValue(text) {
  var value = clean(text)
  var century = value.match(/^(\d+)(?:st|nd|rd|th) century/)
  if (century) return (Number(century[1]) - 1) * 100 + 50
  var number = value.match(/\d+/)
  if (!number) return NaN
  var year = Number(number[0])
  return /\bBC\b/.test(value) ? -year : year
}

// Canon indices in the order the buildings were built.
function chronology(list) {
  var buildings = list || BUILDINGS
  var order = []
  for (var i = 0; i < buildings.length; i++) order.push(i)
  order.sort(function(a, b) {
    var diff = yearValue(buildings[a].y) - yearValue(buildings[b].y)
    return diff !== 0 ? diff : a - b
  })
  return order
}

function chronoRank(entry, list) {
  var buildings = list || BUILDINGS
  return chronology(buildings).indexOf(buildings.indexOf(entry))
}

// The date on which the building `step` places earlier (-1) or later (+1) in
// history is dealt, staying inside the current cycle.
function chronoStepKey(entry, fromKey, step, list) {
  var buildings = list || BUILDINGS
  var order = chronology(buildings)
  var rank = order.indexOf(buildings.indexOf(entry))
  if (rank < 0) return String(fromKey || "")
  var next = Math.max(0, Math.min(order.length - 1, rank + (parseInt(step, 10) || 0)))
  return dateKeyForIndex(order[next], fromKey, buildings)
}

function yearLabel(text) {
  var year = yearValue(text)
  if (isNaN(year)) return ""
  return year < 0 ? String(-year) + " BC" : String(year)
}

// ---- the clock on the wall -------------------------------------------------

// Local time at the building, from its longitude alone: fifteen degrees to
// the hour. Political zones and half-hour offsets are ignored, so this is
// within an hour of the truth everywhere and exact in most of the world —
// enough to know whether it is night there.
function localTimeLine(summary, nowMs) {
  // Greenwich is a real place; only the parser's (0, 0) means "unknown".
  if (!summary || (!summary.lat && !summary.lon)) return ""
  var offset = Math.round(summary.lon / 15) * 3600000
  var there = new Date(Number(nowMs) + offset)
  var hours = there.getUTCHours()
  var minutes = pad2(there.getUTCMinutes())
  var twelve = hours % 12 === 0 ? 12 : hours % 12
  return twelve + ":" + minutes + (hours < 12 ? " am" : " pm") + " there"
}

// ---- text ----------------------------------------------------------------

function creditLine(entry) {
  if (!entry) return ""
  var parts = []
  if (clean(entry.a)) parts.push(clean(entry.a))
  if (clean(entry.y)) parts.push(clean(entry.y))
  return parts.join(" · ")
}

function placeLine(entry, summary, nowMs) {
  if (!entry) return ""
  var parts = []
  if (clean(entry.p)) parts.push(clean(entry.p))
  if (clean(entry.s)) parts.push(clean(entry.s))
  var clock = localTimeLine(summary, nowMs)
  if (clock) parts.push(clock)
  return parts.join("  ·  ")
}

function barLabel(entry, maxChars) {
  if (!entry) return APP_NAME
  var name = clean(entry.n)
  var limit = Math.max(6, parseInt(maxChars, 10) || 22)
  if (name.length <= limit) return name
  return name.substring(0, limit - 1).replace(/[\s,.-]+$/, "") + "…"
}

function tooltipText(entry) {
  if (!entry) return APP_NAME
  var credit = creditLine(entry)
  return credit ? clean(entry.n) + " — " + credit : clean(entry.n)
}

// The article's own opening paragraph when we have it, the curated line when
// we do not. Never empty.
function bodyText(entry, summary) {
  var extract = summary ? clean(summary.extract) : ""
  if (extract) return extract
  return entry ? clean(entry.note) : ""
}

// Trim a long Wikipedia extract to whole sentences so the panel never ends
// mid-clause.
function trimToSentences(text, maxChars) {
  var value = clean(text)
  var limit = Math.max(80, parseInt(maxChars, 10) || 520)
  if (value.length <= limit) return value
  var cut = value.substring(0, limit)
  var stop = Math.max(cut.lastIndexOf(". "), Math.max(cut.lastIndexOf("! "), cut.lastIndexOf("? ")))
  if (stop > limit * 0.5) return cut.substring(0, stop + 1)
  return cut.replace(/\s+\S*$/, "") + "…"
}

function sourceLine(summary) {
  return summary && summary.ok ? "Wikipedia" : "Offline · curated note"
}

// ---- commands ------------------------------------------------------------

function slug(title) {
  return String(title || "").replace(/[^A-Za-z0-9_.-]/g, "_").substring(0, 120)
}

function summaryUrl(title) {
  return WIKI_API + encodeURIComponent(String(title || ""))
}

function pageUrl(title) {
  return WIKI_PAGE + encodeURIComponent(String(title || ""))
}

function summaryCachePath(cacheDir, title) {
  return String(cacheDir || "") + "/" + slug(title) + ".json"
}

function imageCachePath(cacheDir, title, url) {
  var ext = ".jpg"
  var match = String(url || "").match(/\.(jpe?g|png|webp|gif|svg)(\?|$)/i)
  if (match) ext = "." + match[1].toLowerCase()
  return String(cacheDir || "") + "/" + slug(title) + ext
}

// Fetch-once-then-serve-from-disk. Args are passed positionally rather than
// interpolated so nothing in a title or URL can escape into the shell.
function summaryCommand(cacheDir, title, force) {
  var script =
    'mkdir -p "$1" || exit 1; ' +
    (force ? 'rm -f "$2"; ' : "") +
    'if [ ! -s "$2" ]; then ' +
    'curl -fsSL --max-time 15 -A "$4" -H "Accept: application/json" -o "$2.part" "$3" || { rm -f "$2.part"; exit 1; }; ' +
    'mv "$2.part" "$2"; ' +
    'fi; cat "$2"'
  return ["sh", "-c", script, "sh", String(cacheDir || ""), summaryCachePath(cacheDir, title), summaryUrl(title), USER_AGENT]
}

function imageCommand(cacheDir, path, url) {
  var script =
    'mkdir -p "$1" || exit 1; ' +
    'if [ ! -s "$2" ]; then ' +
    'curl -fsSL --max-time 30 -A "$4" -o "$2.part" "$3" || { rm -f "$2.part"; exit 1; }; ' +
    'mv "$2.part" "$2"; ' +
    'fi; printf %s "$2"'
  return ["sh", "-c", script, "sh", String(cacheDir || ""), String(path || ""), String(url || ""), USER_AGENT]
}

// Housekeeping: the cache is disposable, so anything untouched for a while goes.
function pruneCommand(cacheDir, days) {
  var age = String(Math.max(7, parseInt(days, 10) || 120))
  return ["sh", "-c", 'test -d "$1" && find "$1" -type f -mtime +"$2" -delete 2>/dev/null; exit 0', "sh", String(cacheDir || ""), age]
}

function copyPayload(entry, summary) {
  if (!entry) return ""
  var lines = [clean(entry.n)]
  var credit = creditLine(entry)
  if (credit) lines.push(credit)
  if (clean(entry.p)) lines.push(clean(entry.p))
  lines.push(pageUrl(entry.w))
  return lines.join("\n")
}

function copyCommand(text) {
  return ["sh", "-c", 'printf %s "$1" | wl-copy', "sh", String(text || "")]
}

function openCommand(title) {
  return ["xdg-open", pageUrl(title)]
}

function mapCommand(summary) {
  if (!summary || !summary.lat || !summary.lon) return null
  return ["xdg-open", "https://www.openstreetmap.org/?mlat=" + summary.lat + "&mlon=" + summary.lon + "#map=17/" + summary.lat + "/" + summary.lon]
}

function notificationText(text) {
  var value = clean(text)
  if (value.length > 180) value = value.substring(0, 177) + "…"
  return value.charAt(0) === "-" ? "⁠" + value : value
}

function toastCommand(entry) {
  if (!entry) return null
  return [
    "omarchy-notification-send",
    "--app-name", APP_NAME,
    "-u", "low",
    notificationText(clean(entry.n)),
    notificationText(creditLine(entry) + " — " + clean(entry.note)),
    "-p"
  ]
}

// ---- parsing -------------------------------------------------------------

function parseJson(raw) {
  try {
    var value = JSON.parse(String(raw || ""))
    return value && typeof value === "object" ? value : null
  } catch (error) {
    return null
  }
}

// Wikipedia's REST summary, reduced to the handful of fields the panel uses.
// Anything missing degrades to empty rather than throwing.
function parseSummary(raw) {
  var data = parseJson(raw)
  if (!data || data.type === "https://mediawiki.org/wiki/HyperSwitch/errors/not_found") {
    return { ok: false, extract: "", description: "", image: "", thumb: "", lat: 0, lon: 0 }
  }
  var original = data.originalimage || {}
  var thumbnail = data.thumbnail || {}
  var coords = data.coordinates || {}
  // Prefer the thumbnail: full-resolution originals can be 20 MB, and the hero
  // is never wider than a panel.
  var image = clean(thumbnail.source) || clean(original.source)
  return {
    ok: true,
    title: clean(data.title),
    extract: clean(data.extract),
    description: clean(data.description),
    image: image,
    thumb: clean(thumbnail.source),
    lat: Number(coords.lat) || 0,
    lon: Number(coords.lon) || 0
  }
}

// Wikimedia serves modest thumbnail widths by default; ask for one that will
// still look right on a HiDPI panel.
function upscaleThumb(url, width) {
  var value = String(url || "")
  var target = Math.max(320, Math.min(1600, parseInt(width, 10) || 900))
  return value.replace(/\/(\d+)px-/, function(match, current) {
    return Number(current) >= target ? match : "/" + target + "px-"
  })
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    APP_NAME: APP_NAME,
    FORMS: FORMS,
    BUILDINGS: BUILDINGS,
    pad2: pad2,
    clean: clean,
    boolSetting: boolSetting,
    dateKeyFromDate: dateKeyFromDate,
    parseDateKey: parseDateKey,
    shiftDateKey: shiftDateKey,
    dayNumber: dayNumber,
    dateKeyFromDayNumber: dateKeyFromDayNumber,
    dateHeading: dateHeading,
    seededRandom: seededRandom,
    cycleOrder: cycleOrder,
    indexForDay: indexForDay,
    entryForDateKey: entryForDateKey,
    cyclePosition: cyclePosition,
    cycleLine: cycleLine,
    dateKeyForIndex: dateKeyForIndex,
    yearValue: yearValue,
    yearLabel: yearLabel,
    chronology: chronology,
    chronoRank: chronoRank,
    chronoStepKey: chronoStepKey,
    localTimeLine: localTimeLine,
    creditLine: creditLine,
    placeLine: placeLine,
    barLabel: barLabel,
    tooltipText: tooltipText,
    bodyText: bodyText,
    trimToSentences: trimToSentences,
    sourceLine: sourceLine,
    slug: slug,
    summaryUrl: summaryUrl,
    pageUrl: pageUrl,
    summaryCachePath: summaryCachePath,
    imageCachePath: imageCachePath,
    summaryCommand: summaryCommand,
    imageCommand: imageCommand,
    pruneCommand: pruneCommand,
    copyPayload: copyPayload,
    copyCommand: copyCommand,
    openCommand: openCommand,
    mapCommand: mapCommand,
    toastCommand: toastCommand,
    parseJson: parseJson,
    parseSummary: parseSummary,
    upscaleThumb: upscaleThumb
  }
}
