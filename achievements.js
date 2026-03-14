// Achievement definitions using state data creatively
const ACHIEVEMENTS = [
  // === PROGRESS MILESTONES ===
  { id:"first", name:"First Find!", desc:"Spot your first license plate", icon:"\u{1F3AF}", cat:"Progress",
    test: (c) => c.size >= 1 },
  { id:"five", name:"High Five!", desc:"Find 5 states", icon:"\u{270B}", cat:"Progress",
    test: (c) => c.size >= 5 },
  { id:"ten", name:"Double Digits!", desc:"Find 10 states", icon:"\u{1F525}", cat:"Progress",
    test: (c) => c.size >= 10 },
  { id:"twenty", name:"Score!", desc:"Find 20 states", icon:"\u26A1", cat:"Progress",
    test: (c) => c.size >= 20 },
  { id:"half", name:"Halfway There!", desc:"Find 25 states", icon:"\u{1F31F}", cat:"Progress",
    test: (c) => c.size >= 25 },
  { id:"forty", name:"Home Stretch!", desc:"Find 40 states", icon:"\u{1F3C1}", cat:"Progress",
    test: (c) => c.size >= 40 },
  { id:"all50", name:"All 50 States!", desc:"Complete the whole collection!", icon:"\u{1F3C6}", cat:"Progress",
    test: (c) => c.size >= 50 },

  // === ANIMAL TRACKER ===
  { id:"deer3", name:"Deer Spotter", desc:"Find 3 White-tailed Deer states", icon:"\u{1F98C}", cat:"Animals",
    test: (c,s) => countField(c,s,'animal','White-tailed Deer') >= 3 },
  { id:"deer7", name:"Deer Tracker", desc:"Find 7 White-tailed Deer states", icon:"\u{1F98C}", cat:"Animals",
    test: (c,s) => countField(c,s,'animal','White-tailed Deer') >= 7 },
  { id:"deerAll", name:"Deer Master!", desc:"Find all 11 White-tailed Deer states", icon:"\u{1F98C}", cat:"Animals",
    test: (c,s) => countField(c,s,'animal','White-tailed Deer') >= 11 },
  { id:"bears", name:"Bear Country", desc:"Find all 4 Black Bear states", icon:"\u{1F43B}", cat:"Animals",
    test: (c,s) => countField(c,s,'animal','Black Bear') >= 4 },
  { id:"horses", name:"Horse Power!", desc:"Find all 5 Horse states", icon:"\u{1F434}", cat:"Animals",
    test: (c,s) => countFieldIncludes(c,s,'animal','Horse') >= 5 },
  { id:"bison", name:"Bison Herd", desc:"Find all 3 Bison/Buffalo states", icon:"\u{1F9AC}", cat:"Animals",
    test: (c,s) => countFieldMatch(c,s,'animal',a => a==='Bison'||a==='American Buffalo') >= 3 },
  { id:"moose", name:"Moose Crossing", desc:"Spot both Moose states (AK & ME)", icon:"\u{1F98C}", cat:"Animals",
    test: (c) => c.has('AK') && c.has('ME') },
  { id:"mystery", name:"Mystery Mammals", desc:"Find all 3 states with no official mammal", icon:"\u2753", cat:"Animals",
    test: (c) => c.has('IN') && c.has('IA') && c.has('MN') },

  // === FLOWER FINDER ===
  { id:"violets", name:"Violet Bunch", desc:"Find all 4 Violet states (IL, NJ, RI, WI)", icon:"\u{1F49C}", cat:"Flowers",
    test: (c,s) => countField(c,s,'flower','Violet') >= 4 },
  { id:"magnolia", name:"Magnolia Trail", desc:"Find both Magnolia states (LA & MS)", icon:"\u{1F338}", cat:"Flowers",
    test: (c,s) => countField(c,s,'flower','Magnolia') >= 2 },
  { id:"laurel", name:"Mountain Laurel", desc:"Find both Mountain Laurel states (CT & PA)", icon:"\u{1F33F}", cat:"Flowers",
    test: (c) => c.has('CT') && c.has('PA') },
  { id:"prairie", name:"Prairie Bloom", desc:"Find both Wild Prairie Rose states (IA & ND)", icon:"\u{1F33A}", cat:"Flowers",
    test: (c) => c.has('IA') && c.has('ND') },

  // === GEOGRAPHY ===
  { id:"nearby", name:"Close to Home", desc:"Find 5 states within 200 miles", icon:"\u{1F3E0}", cat:"Geography",
    test: (c,s,o) => countNearby(c,s,200,o) >= 5 },
  { id:"faraway", name:"Far Away!", desc:"Find a state over 2,000 miles away", icon:"\u2708\uFE0F", cat:"Geography",
    test: (c,s,o) => hasFarState(c,s,2000,o) },
  { id:"aloha", name:"Aloha!", desc:"Spot a Hawaii plate", icon:"\u{1F33A}", cat:"Geography",
    test: (c) => c.has('HI') },
  { id:"frontier", name:"Last Frontier", desc:"Spot an Alaska plate", icon:"\u2744\uFE0F", cat:"Geography",
    test: (c) => c.has('AK') },
  { id:"coast", name:"Coast to Coast", desc:"Find a Pacific AND an Atlantic coast state", icon:"\u{1F30A}", cat:"Geography",
    test: (c) => hasPacific(c) && hasAtlantic(c) },

  // === REGIONAL ===
  { id:"neweng", name:"New England", desc:"Find all 6 New England states", icon:"\u{1F341}", cat:"Regional",
    test: (c) => hasAll(c,['CT','ME','MA','NH','RI','VT']) },
  { id:"corners", name:"Four Corners", desc:"Find AZ, CO, NM, UT", icon:"\u{1F3DC}\uFE0F", cat:"Regional",
    test: (c) => hasAll(c,['AZ','CO','NM','UT']) },
  { id:"original", name:"Original 13", desc:"Find all 13 original colonies", icon:"\u{1F5FD}", cat:"Regional",
    test: (c) => hasAll(c,['CT','DE','GA','MD','MA','NH','NJ','NY','NC','PA','RI','SC','VA']) },
  { id:"carolinas", name:"The Carolinas", desc:"Find both NC & SC", icon:"\u{1F91D}", cat:"Regional",
    test: (c) => c.has('NC') && c.has('SC') },
  { id:"dakotas", name:"The Dakotas", desc:"Find both ND & SD", icon:"\u{1F91D}", cat:"Regional",
    test: (c) => c.has('ND') && c.has('SD') },
  { id:"virginias", name:"The Virginias", desc:"Find both VA & WV", icon:"\u{1F91D}", cat:"Regional",
    test: (c) => c.has('VA') && c.has('WV') },
  { id:"news", name:"Breaking News!", desc:'Find all 4 "New" states (NH, NJ, NM, NY)', icon:"\u{1F4F0}", cat:"Regional",
    test: (c) => hasAll(c,['NH','NJ','NM','NY']) }
];

// Helper functions for achievement tests
function countField(checked, states, field, value) {
  return states.filter(s => checked.has(s.abbr) && s[field] === value).length;
}
function countFieldIncludes(checked, states, field, substr) {
  return states.filter(s => checked.has(s.abbr) && s[field].includes(substr)).length;
}
function countFieldMatch(checked, states, field, fn) {
  return states.filter(s => checked.has(s.abbr) && fn(s[field])).length;
}
function hasAll(checked, abbrs) {
  return abbrs.every(a => checked.has(a));
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function countNearby(checked, states, miles, origin) {
  if (!origin) return 0;
  return states.filter(s => checked.has(s.abbr) && haversine(origin.lat, origin.lon, s.lat, s.lon) <= miles).length;
}
function hasFarState(checked, states, miles, origin) {
  if (!origin) return false;
  return states.some(s => checked.has(s.abbr) && haversine(origin.lat, origin.lon, s.lat, s.lon) >= miles);
}

const PACIFIC = ['WA','OR','CA','AK','HI'];
const ATLANTIC = ['ME','NH','MA','RI','CT','NY','NJ','DE','MD','VA','NC','SC','GA','FL'];
function hasPacific(checked) { return PACIFIC.some(a => checked.has(a)); }
function hasAtlantic(checked) { return ATLANTIC.some(a => checked.has(a)); }
