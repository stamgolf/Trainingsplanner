-- Basisgegevens Trainingsplanner. Uitvoeren na schema.sql.
-- Pas de coach-rij hieronder aan (naam + e-mailadres waarmee je inlogt) voordat je dit uitvoert.

insert into locations ("id","name","short","type","shared","capacity","order") values
('loc_baan','Grote baan','Baan','baan',true,4,1),
('loc_par3','Par-3 baan','Par-3','baan',true,2,2),
('loc_short','Short game','Short game','oefen',false,1,3),
('loc_putt','Puttinggreen','Putting','oefen',false,1,4),
('loc_kunst','Kunstgrasgreen','Kunstgras','oefen',false,1,5),
('loc_range','Driving range','Range','oefen',true,3,6),
('loc_gym','Gym','Gym','indoor',false,1,7),
('loc_extern','Extern','Extern','extern',true,9,8),
('loc_anders','Anders','Anders','anders',true,9,9)
on conflict (id) do nothing;

insert into group_types ("id","name","color","order") values
('gt_jeugd','Jeugd','#F47C20',1),
('gt_comp','Competitie','#4A6FA5',2),
('gt_begin','Beginnerscursus','#17a05c',3),
('gt_volw','Volwassenen','#8E6BB5',4),
('gt_pers','Personeelsles','#2A9D8F',5),
('gt_overig','Overig','#7A7F85',6)
on conflict (id) do nothing;

insert into activity_types ("id","name","color","order") values
('at_training','Training','#7A7F85',1),
('at_wedstrijd','Wedstrijd','#F47C20',2),
('at_clinic','Clinic','#2A9D8F',3),
('at_overleg','Overleg','#8E6BB5',4),
('at_cursus','Cursus','#17a05c',5),
('at_overig','Overig','#C2383A',6)
on conflict (id) do nothing;

insert into seasons ("id","name","start","end") values
('s_zomer26','Zomer 2026','2026-04-01','2026-10-04'),
('s_winter26','Winter 2026-27','2026-10-05','2027-03-28')
on conflict (id) do nothing;

insert into breaks ("id","season_id","name","start","end") values
('b_herfst','s_winter26','Herfstvakantie','2026-10-17','2026-10-25'),
('b_kerst','s_winter26','Kerstvakantie','2026-12-19','2027-01-03'),
('b_voorjaar','s_winter26','Voorjaarsvakantie','2027-02-20','2027-02-28')
on conflict (id) do nothing;

insert into coaches ("id","name","email","color","is_coordinator","is_coach","specialisaties","availability","active") values
('c_tom','Tom Stam','tom@almeerderhout.nl','#F47C20',true,true,'["jeugd","competitie","putten"]'::jsonb,'{"0":null,"1":["09:00","21:00"],"2":["09:00","21:00"],"3":["09:00","21:00"],"4":["09:00","21:00"],"5":["09:00","21:00"],"6":["08:00","17:00"]}'::jsonb,true)
on conflict (id) do nothing;

