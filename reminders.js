/* ===== HOME PAGE REMINDERS =====
   duty: the message at the top of the staff Home page.
   health: one is shown each day (rotates by date). Each tip names a section of the FDA Food Code as adopted by
   Florida (61C-1.001, F.A.C.); the page links it to the Food Code PDF. 'law' tips link to a Florida statute instead.
   Plain words, one or two sentences. Add or edit freely; keep the section numbers accurate. */
window.FOH_REMINDERS = {
  duty: 'Bartender on duty: hand out checklist tasks to servers and food runners when it’s slow. ' +
        'AM tasks not done by 4 PM go to the PM shift. Anything not done at close is the PM bartender’s.',
  /* Standing reminders: shown every day in the Today card, in this order, until removed.
     tag: the label on the left; style: 'urgent' (amber), 'miss' (red) or '' (plain). */
  notes: [
    {tag: 'Close out', style: 'urgent', text: 'All of your tasks and photos must be done before you can close out your shift.'},
    {tag: 'Reminder', style: 'urgent', text: 'Change the sanitizer water and rag every 2 hours.'},
    {tag: 'Bathrooms', style: 'miss', text: 'Bathrooms have not been kept up. Clean them thoroughly every night, and check, touch up and restock them throughout the day.'}
  ],
  health: [
    {code: '2-301.14', text: 'Wash your hands after touching your face, hair, phone, money, trash or dirty dishes, and before touching ice, garnishes or clean glasses.'},
    {code: '2-301.12', text: 'Handwashing takes at least 20 seconds with soap and warm water. Dry with a paper towel.'},
    {code: '5-205.11', text: 'The handwashing sink is for washing hands only. Never dump ice, drinks or dishes in it, and keep it clear.'},
    {code: '6-301.12', text: 'Every handwashing sink needs soap and paper towels at all times. Restock the moment either runs low.'},
    {code: '3-301.11', text: 'Never touch garnishes, ice or other ready-to-eat food with bare hands. Use tongs, picks, a scoop or gloves.'},
    {code: '3-304.12', text: 'The ice scoop handle never touches the ice. Best practice: keep the scoop outside the bin in a clean holder.'},
    {code: '3-303.11', text: 'Ice used to chill bottles, cans or the garnish caddy can never go into a drink.'},
    {code: '4-904.11', text: 'Hold glasses by the base or stem, never by the rim where guests drink. Carry silverware by the handles.'},
    {code: '3-304.14', text: 'Wiping cloths stay in sanitizer between uses. Never leave a damp rag sitting on the bar.'},
    {code: '4-302.14', text: 'Test sanitizer with test strips. The test kit must be on hand wherever we use sanitizer.'},
    {code: '4-501.114', text: 'Sanitizer must be at the strength on its label: too weak won’t kill germs, too strong is a chemical hazard.'},
    {code: '7-201.11', text: 'Store chemicals below and away from food, ice, glassware and to-go supplies.'},
    {code: '7-102.11', text: 'Every spray bottle and chemical container must be labeled with what is in it.'},
    {code: '2-201.11', text: 'Tell the manager if you have vomiting, diarrhea, yellow skin or eyes, or a sore throat with fever. You may need to stay home.'},
    {code: '2-401.11', text: 'Staff drinks go in a cup with a lid and straw, away from bar prep areas. No eating behind the bar.'},
    {code: '3-501.16', text: 'Cold food stays at 41°F or below. Cream, milk and cut melons go back in the cooler right after use.'},
    {code: '4-204.112', text: 'Every cooler needs a working thermometer you can read. Tell the manager if one is missing or reads above 41°F.'},
    {code: '3-305.11', text: 'Store food, drink supplies and ice at least 6 inches off the floor. Never set cases or bags of ice on the floor.'},
    {code: '4-903.11', text: 'Store clean glasses and utensils upside down or covered, at least 6 inches off the floor.'},
    {code: '6-501.111', text: 'Report fruit flies, roaches or droppings to the manager right away. Pests are a priority violation.'},
    {code: '5-501.113', text: 'Outdoor trash and recycling lids stay closed.'},
    {code: '4-602.11', text: 'Bar tools, shakers and cutting boards in constant use are washed, rinsed and sanitized at least every 4 hours.'},
    {code: '3-501.17', text: 'Refrigerated ready-to-eat food kept over 24 hours must be date-marked (7 days max). Our house rule for cut fruit and juices is 2 days.'},
    {code: '3-202.16', text: 'Ice comes only from our ice machine or an approved supplier. Never bring in ice from home or a store.'},
    {code: '2-302.11', text: 'Keep fingernails trimmed and clean.'},
    {code: '2-303.11', text: 'No jewelry on hands or arms while cutting garnishes or handling food, except a plain band ring.'},
    {code: '6-501.12', text: 'Clean floors and walls when it’s slow, not over open ice, garnishes or glassware.'},
    {code: '4-601.11', text: 'Anything that touches drinks or ice must be clean to sight and touch: no residue on shakers, jiggers or the soda gun.'},
    {law: '509.049, F.S.', url: 'http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0500-0599/0509/Sections/0509.049.html',
     text: 'Florida law: every new employee completes approved food safety training within 60 days of hire. Ask the manager if you haven’t.'}
  ]
};
