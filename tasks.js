/* ===== BUILT-IN TASK LISTS =====
   Used until a manager taps Save on the manager page (manage.html). After that, the list saved there is used
   and changes here no longer show on phones; edit tasks on the manager page instead.
   Each task: ['id','Task','Details (or null)',['Food Code sections']]. Never reuse or change an id
   (the w-mon-* ids are the old Monday tasks, moved to other days when Mondays closed). */
const DAILY=[
 {role:'Open · Bar',note:'Openers: full stock and setup. Work top down so you don’t dirty what you just cleaned. Everything done before service.',items:[
  ['o-dust','Walls, ceilings, and lights brushed','Dust and overnight spiders, bar and dining. Knock down any cobwebs you see all day.'],
  ['o-bartop','Entire bar top and display shelves wiped down'],
  ['o-display','Liquor bottles set in display spots','Match the bar bible photo. Labels forward and clean. Display cooler lights on.'],
  ['o-wells','Speed wells organized for efficiency and seasonal cocktails'],
  ['o-ice','Ice bins filled completely; ice buckets stored upside down'],
  ['o-taps','Beer taps on'],
  ['o-garnish','Garnishes cut, labeled, dated, and iced','Lemons, limes, oranges, cucumbers, jalapeños. Lidded, labeled, in the iced-down caddy.',['3-302.12']],
  ['o-juice','Juices stocked in a half pan on ice','OJ, pineapple, lime, and seasonals'],
  ['o-glass','Glassware stocked: wine, rocks, Collins, pints'],
  ['o-tools','Bar tools out; sani spray and bar towels ready','Shakers, strainers, jiggers, yarai',['3-304.14']],
  ['o-mats','Bar mats set, logos facing guests'],
  ['o-tvs','TVs on, sports playing'],
  ['o-final','Final check: bar clean, organized, guest-ready','Photo of the whole bar from the guest side']]},
 {role:'Open · Floor',items:[
  ['o-trash','Trash cans out for service'],
  ['o-caddies','Napkin holders and caddies stocked and placed','Tables and bar top. To-go’s, salt, pepper, and silverware on hand.'],
  ['o-rest','Restrooms stocked and guest-ready (upstairs)','Soap, paper towels, toilet paper',['6-301.11','6-301.12','6-302.11']]]},
 {role:'Close · Bar breakdown',note:'Closers: full clean and reset — everything ready for open. You can preclose, but you’re not cut until a manager says so. Mosquito season: close the screens 30 minutes before sunset.',items:[
  ['c-bottles','Wells broken down; every bottle wiped and locked up','Pull all bottles, wipe each clean, return to proper storage'],
  ['c-garnish','Garnishes tossed or stored; everything opened labeled and dated','48-hour max on cut garnishes',['3-302.12']],
  ['c-caddy','Fruit caddies cleaned and sanitized',null,['4-602.11']],
  ['c-icewell','Ice wells burned, cleaned, sanitized — no mold',null,['4-602.11','4-702.11']],
  ['c-sinks','Bar sinks cleaned and sanitized — no buildup'],
  ['c-soda','Soda gun nozzles and holder cleaned',null,['4-602.11']],
  ['c-draft','Draft handles and taps wiped; drip tray cleaned'],
  ['c-lines','Draft lines shut off (down bartender)'],
  ['c-wine','Open wine checked and dated','Red 3 days, white 7 days. Give expired bottles to the MOD.'],
  ['c-mats','Bar mats pulled, cleaned, and cleaned under'],
  ['c-tvs','TVs off']]},
 {role:'Close · Bar floor & reset',items:[
  ['c-chairs','All chairs and bar stools moved'],
  ['c-floor','Bar floor swept and mopped, left clean and dry','Rugs, under ice wells, behind the bar. Pull trash from drains. Mop behind bar; spot-mop sticky areas.'],
  ['c-rails','Bar tops, rails, speed rails (sides too), and service areas wiped'],
  ['c-reset','Bar organized and light-stocked for next shift','Photo of the finished bar']]},
 {role:'Close · Dining & restrooms',items:[
  ['c-station','Server station wiped out'],
  ['c-dining','Dining floor swept','Broom and dustpan — not blown off'],
  ['c-trash','All trash out; new liners in every can','Bar cans and dining trash boxes'],
  ['c-trashwall','FOH trash can wall cleaned'],
  ['c-fountain','Soda fountain cleaned and sanitized','Spill trays pulled and washed, levers and backsplash cleaned, nozzles and diffusers washed and sanitized',['4-602.11','4-702.11']],
  ['c-drink','Drink machine cleaned'],
  ['c-italian','Italian ice machine cleaned','Wipe exterior. Parts that touch product: wash, rinse, sanitize per manufacturer.',['4-602.11']],
  ['c-rest','Restrooms full clean (upstairs)','Sinks, dispensers, toilets, mirrors, walls. Women’s sanitary boxes emptied, lids on. Bathrooms and hallway swept and mopped — tiles white.',['5-501.17']],
  ['c-chem','Sanitizer buckets dumped; chemicals stored away from and below food and ice',null,['3-304.14','7-201.11']]]}
];
const WEEKLY=[
 {role:'Tuesday · Storage & backups',day:2,items:[
  ['w-tue-cab','All storage cabinets wiped out'],
  ['w-tue-cooler','Beer and wine cooler organized, first in first out'],
  ['w-tue-keg','Keg room swept and cleaned'],
  ['w-tue-backups','Backups restocked','Forks, knives, napkins, straws, to-go supplies'],
  ['w-bathfloor','Bathroom floors scrubbed','Deck brush, grout lines, behind toilets']]},
 {role:'Wednesday · Bar equipment',day:3,items:[
  ['w-wed-liquor','Liquor room cleaned and organized','Sweep under shelves, mop the closet'],
  ['w-wed-place','Everything in its designated spot, including event equipment'],
  ['w-wed-soda','Soda guns and holders sanitized',null,['4-602.11']],
  ['w-wed-taps','Taps and draft handles cleaned'],
  ['w-wed-handles','Cooler handles cleaned'],
  ['w-wed-pos','POS stations wiped'],
  ['w-pingpong','Ping pong table full clean','Top, legs, net, underside']]},
 {role:'Thursday · Bar exterior detail',day:4,items:[
  ['w-thu-out','Outside of all bars and foot walls wiped; scuffs and residue removed'],
  ['w-thu-stools','Bar stools and chair legs wiped'],
  ['w-thu-trim','Trim and ledges cleaned'],
  ['w-mon-tables','Bar tables and chairs wiped']]},
 {role:'Friday · Storage detail',day:5,items:[
  ['w-fri-deck','Under the dry deck cleaned'],
  ['w-fri-cups','Cup and storage areas cleaned and organized','Including under the mats where cups sit'],
  ['w-fri-bottles','Liquor bottles wiped'],
  ['w-fri-garnish','Garnish station organized'],
  ['w-cobweb','Cobweb walkthrough, whole property','Rafters, fence, light strings, under benches']]},
 {role:'Saturday · Light maintenance',day:6,items:[
  ['w-sat-service','Service areas and service stations spot-cleaned and wiped'],
  ['w-sat-inv','Inventory check and top-off','Forks, knives, straws, napkins, mixers. Garnish containers clean.'],
  ['w-sat-cans','Outside of trash cans cleaned'],
  ['w-mon-out','Outside of all bars cleaned and wiped'],
  ['w-mon-trim','Lower trim and kick plates cleaned']]},
 {role:'Sunday · Early close full reset',day:0,items:[
  ['w-sun-mop','Deep mop behind all bars'],
  ['w-sun-drains','Drains cleaned and bleached'],
  ['w-sun-coolers','All coolers wiped out: walls, shelves, gaskets',null,['4-602.13']],
  ['w-sun-wipe','Full wipe of all surfaces'],
  ['w-mon-foot','Guest-side foot walls detailed; scuffs, marks, sticky residue removed']]}
];
/* Photo-required tasks. Tasks in SLOTS need one photo per slot. Everything else is checkbox + initials. */
const SLOTS={'c-rest':['Men’s restroom','Women’s restroom'],'w-bathfloor':['Men’s restroom','Women’s restroom']};
const PHOTO=new Set(['w-bathfloor','o-garnish','o-final','c-garnish','c-icewell','c-sinks','c-soda','c-floor','c-reset','c-fountain','c-italian','c-rest','c-chem','c-dining','w-sun-drains','w-sun-coolers']);
const MONTHLY=[];   // monthly list: added on the manager page
/* Service standards card on the staff Home page (reminders, not tasks). Wording from the FOH Standards &
   Side-Work SOP v2 (Aug 21, 2026). */
const STANDARDS={title:'Service standards',source:'From the FOH Standards & Side-Work SOP v2 (Aug 21, 2026).',items:[
 'Guest experience comes first: every shift, every table, every time.',
 'Bus and wipe every table the moment a guest gets up. Don\u2019t wait to be told.',
 'Pre-bus: clear plates and glassware as guests finish.',
 'Never let a guest stack their own dishes or move them to another table.',
 'Clear menus once guests order; leave one only if they need it for drinks.',
 'See it, clean it: if you walk past a dirty table, it\u2019s yours.',
 'No guest refills their own drink. Our cups hide the level, so check in often.',
 'End of shift: servers check out with the closing server; the closing server checks out with the closing bartender.']};
window.FOH_TASKS={DAILY,WEEKLY,MONTHLY,SLOTS,PHOTO,STANDARDS};
