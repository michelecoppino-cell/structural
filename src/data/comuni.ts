/**
 * Comuni italiani con classificazione sismica e coordinate.
 *
 * FILE GENERATO — non modificare a mano: `node scripts/genera-comuni.mjs`.
 *
 * Sorgenti:
 *  - classificazione sismica (zona 1÷4) — Dipartimento della Protezione Civile,
 *    aggiornamento 2024 (OPCM 3519/2006);
 *  - coordinate del municipio (WGS84) — elenco ISTAT dei comuni.
 *
 * 7899 comuni · 107 province · 20 regioni.
 *
 * I dati sono impacchettati in una stringa e letti una volta sola all'avvio:
 * «#Regione», «@SIGLA|Provincia», «Comune|zona|lat|lon».
 */

/** Zona sismica canonica: 1 = pericolosità più alta, 4 = più bassa. */
export type ZonaSismica = 1 | 2 | 3 | 4;

export interface Comune {
  nome: string;
  /** Nome esteso della provincia o città metropolitana. */
  provincia: string;
  sigla: string;
  regione: string;
  /** Zona sismica canonica (1÷4). */
  zona: ZonaSismica;
  /** Etichetta pubblicata dalla Regione: può avere sottozone ("2A", "3S"). */
  zonaLabel: string;
  lat: number;
  lon: number;
  /** Posizione in COMUNI: è la chiave dei parametri sismici del sito. */
  indice: number;
}

const DATI = `
#Abruzzo
@CH|Chieti
Altino|1|42.0993|14.3316
Archi|2|42.0899|14.3812
Ari|2|42.2923|14.263
Arielli|2|42.3824|14.3593
Atessa|3|42.0718|14.4489
Bomba|2|42.0343|14.3671
Borrello|1|41.9189|14.3044
Bucchianico|2|42.3048|14.181
Canosa Sannita|2|42.2955|14.3007
Carpineto Sinello|3|42.012|14.505
Carunchio|2|41.9166|14.5267
Casacanditella|1|42.2474|14.1993
Casalanguida|3|42.0366|14.4994
Casalbordino|3|42.1506|14.5848
Casalincontrada|2|42.2902|14.1342
Casoli|1|42.1146|14.2902
Castel Frentano|2|42.1971|14.3552
Castelguidone|2|41.8236|14.5241
Castiglione Messer Marino|2|41.8683|14.4531
Celenza sul Trigno|2|41.8723|14.5779
Chieti|2|42.1027|14.4159
Civitaluparella|2|41.9449|14.3032
Civitella Messer Raimondo|1|42.0887|14.2172
Colledimacine|2|42.0044|14.2006
Colledimezzo|2|41.9857|14.3811
Crecchio|2|42.2985|14.3269
Cupello|3|42.0692|14.6678
Dogliola|3|41.9419|14.6363
Fallo|2|41.9383|14.3236
Fara Filiorum Petri|2|42.2487|14.1859
Fara San Martino|1|42.0898|14.2053
Filetto|2|42.2282|14.2451
Fossacesia|3|42.2446|14.4829
Fraine|2|41.9054|14.4864
Francavilla al Mare|2|42.4206|14.287
Fresagrandinaria|3|41.9789|14.6634
Frisa|3|42.2612|14.3694
Furci|3|42.0079|14.5879
Gamberale|1|41.906|14.2073
Gessopalena|1|42.0566|14.2731
Gissi|3|42.0212|14.5457
Giuliano Teatino|2|42.307|14.2788
Guardiagrele|1|42.1955|14.2197
Guilmi|2|41.997|14.4784
Lama dei Peligni|1|42.0415|14.1862
Lanciano|2|42.2305|14.3908
Lentella|3|41.9963|14.6775
Lettopalena|1|42.004|14.1568
Liscia|2|41.9552|14.5553
Miglianico|2|42.3592|14.2921
Montazzoli|2|41.9483|14.4291
Montebello sul Sangro|2|41.9873|14.3253
Monteferrante|2|41.9547|14.3884
Montelapiano|2|41.9634|14.3416
Montenerodomo|2|41.9756|14.2528
Monteodorisio|3|42.0859|14.6527
Mozzagrogna|3|42.2128|14.4447
Orsogna|2|42.2189|14.2791
Ortona|3|42.3496|14.4039
Paglieta|3|42.163|14.4973
Palena|1|41.9844|14.138
Palmoli|2|41.9394|14.5814
Palombaro|1|42.1248|14.2306
Pennadomo|1|42.0048|14.3243
Pennapiedimonte|1|42.1531|14.1946
Perano|2|42.1031|14.394
Pietraferrazzana|2|41.9687|14.3754
Pizzoferrato|1|41.9214|14.2357
Poggiofiorito|2|42.2549|14.3223
Pollutri|3|42.1378|14.5917
Pretoro|2|42.2172|14.1416
Quadri|2|41.9249|14.2882
Rapino|1|42.2107|14.1839
Ripa Teatina|2|42.3586|14.2341
Rocca San Giovanni|3|42.2508|14.4648
Roccamontepiano|1|42.2443|14.1272
Roccascalegna|1|42.0625|14.3068
Roccaspinalveti|2|41.9372|14.47
Roio del Sangro|2|41.9115|14.3738
Rosello|2|41.9008|14.3498
San Buono|2|41.9808|14.5699
San Giovanni Lipioni|2|41.8429|14.5617
San Giovanni Teatino|2|42.4105|14.201
San Martino sulla Marrucina|1|42.2234|14.2148
San Salvo|3|42.0433|14.7272
San Vito Chietino|3|42.296|14.4445
Sant'Eusanio del Sangro|2|42.1689|14.3271
Santa Maria Imbaro|3|42.2177|14.4492
Scerni|3|42.1118|14.5701
Schiavi di Abruzzo|2|41.8151|14.4858
Taranta Peligna|1|42.0208|14.1705
Tollo|3|42.348|14.3181
Torino di Sangro|3|42.1881|14.5408
Tornareccio|2|42.0381|14.4161
Torrebruna|2|41.8681|14.5408
Torrevecchia Teatina|2|42.3818|14.2093
Torricella Peligna|1|42.0245|14.2591
Treglio|3|42.2677|14.4255
Tufillo|2|41.9165|14.626
Vacri|2|42.2962|14.2303
Vasto|3|42.1243|14.7059
Villa Santa Maria|2|41.9524|14.3518
Villalfonsina|3|42.1605|14.5716
Villamagna|2|42.3289|14.2361
@AQ|L'Aquila
Acciano|1|42.1765|13.7179
Aielli|1|42.0803|13.5905
Alfedena|1|41.7339|14.0344
Anversa degli Abruzzi|1|41.994|13.8041
Ateleta|1|41.8554|14.1975
Avezzano|1|42.0348|13.4265
Balsorano|1|41.8098|13.5598
Barete|1|42.4485|13.282
Barisciano|1|42.3251|13.5916
Barrea|1|41.7585|13.9907
Bisegna|1|41.9211|13.7576
Bugnara|1|42.0221|13.8616
Cagnano Amiterno|1|42.4552|13.2322
Calascio|1|42.3259|13.6974
Campo di Giove|1|42.0101|14.0394
Campotosto|1|42.5588|13.368
Canistro|1|41.9327|13.3921
Cansano|1|42.0044|14.0119
Capestrano|1|42.2676|13.7687
Capistrello|1|41.9727|13.3991
Capitignano|1|42.5202|13.3009
Caporciano|1|42.2503|13.6735
Cappadocia|2|41.9816|13.2766
Carapelle Calvisio|1|42.2986|13.684
Carsoli|2|42.0989|13.0849
Castel del Monte|1|42.365|13.7266
Castel di Ieri|1|42.1152|13.7426
Castel di Sangro|1|41.7843|14.1081
Castellafiume|1|41.9891|13.3344
Castelvecchio Calvisio|1|42.3106|13.6886
Castelvecchio Subequo|1|42.1302|13.7278
Celano|1|42.0843|13.5462
Cerchio|1|42.0638|13.6001
Civita d'Antino|1|41.8861|13.4711
Civitella Alfedena|1|41.7653|13.9427
Civitella Roveto|1|41.916|13.4269
Cocullo|1|42.0329|13.7747
Collarmele|1|42.059|13.6257
Collelongo|1|41.8863|13.5833
Collepietro|1|42.2216|13.7801
Corfinio|1|42.1242|13.8425
Fagnano Alto|1|42.2542|13.5975
Fontecchio|1|42.2299|13.6059
Fossa|1|42.2929|13.4879
Gagliano Aterno|1|42.1265|13.7
Gioia dei Marsi|1|41.9544|13.6934
Goriano Sicoli|1|42.0808|13.7748
Introdacqua|1|42.0074|13.8983
L'Aquila|1|42.1369|13.6103
Lecce nei Marsi|1|41.9377|13.6841
Luco dei Marsi|1|41.957|13.4736
Lucoli|1|42.2516|13.3769
Magliano de' Marsi|1|42.0915|13.3638
Massa d'Albe|1|42.1072|13.3943
Molina Aterno|1|42.149|13.7354
Montereale|1|42.5251|13.2441
Morino|1|41.8644|13.457
Navelli|1|42.2379|13.729
Ocre|1|42.2825|13.4706
Ofena|1|42.3268|13.7587
Opi|1|41.781|13.8297
Oricola|2|42.0492|13.0394
Ortona dei Marsi|1|41.9973|13.7281
Ortucchio|1|41.955|13.6458
Ovindoli|1|42.137|13.5161
Pacentro|1|42.05|13.9911
Pereto|2|42.0578|13.1016
Pescasseroli|1|41.8084|13.7893
Pescina|1|42.0254|13.6579
Pescocostanzo|1|41.8863|14.0656
Pettorano sul Gizio|1|41.9745|13.9587
Pizzoli|1|42.4361|13.3013
Poggio Picenze|1|42.3206|13.5411
Prata d'Ansidonia|1|42.2778|13.609
Pratola Peligna|1|42.0983|13.874
Prezza|1|42.0581|13.8345
Raiano|1|42.1026|13.8143
Rivisondoli|1|41.8709|14.0674
Rocca di Botte|2|42.0262|13.0677
Rocca di Cambio|1|42.235|13.49
Rocca di Mezzo|1|42.2051|13.5193
Rocca Pia|1|41.9334|13.977
Roccacasale|1|42.1229|13.8881
Roccaraso|1|41.8503|14.0783
San Benedetto dei Marsi|1|42.0082|13.6227
San Benedetto in Perillis|1|42.1839|13.7705
San Demetrio ne' Vestini|1|42.2884|13.5586
San Pio delle Camere|1|42.2862|13.658
San Vincenzo Valle Roveto|1|41.8282|13.5274
Sant'Eusanio Forconese|1|42.2882|13.5244
Sante Marie|1|42.1023|13.2048
Santo Stefano di Sessanio|1|42.3439|13.6442
Scanno|1|41.9039|13.8802
Scontrone|1|41.7461|14.0387
Scoppito|1|42.3726|13.2554
Scurcola Marsicana|1|42.0631|13.3392
Secinaro|1|42.1529|13.6807
Sulmona|1|42.0474|13.927
Tagliacozzo|1|42.0693|13.2547
Tione degli Abruzzi|1|42.2041|13.6354
Tornimparte|1|42.2905|13.2666
Trasacco|1|41.9584|13.5361
Villa Sant'Angelo|1|42.2699|13.5375
Villa Santa Lucia degli Abruzzi|1|42.3335|13.7774
Villalago|1|41.9347|13.842
Villavallelonga|1|41.867|13.6245
Villetta Barrea|1|41.7758|13.9385
Vittorito|1|42.127|13.8167
@PE|Pescara
Abbateggio|1|42.2251|14.0111
Alanno|2|42.2951|13.9713
Bolognano|1|42.2181|13.9609
Brittoli|1|42.3173|13.8616
Bussi sul Tirino|1|42.213|13.8262
Cappelle sul Tavo|2|42.4647|14.102
Caramanico Terme|1|42.157|14.0026
Carpineto della Nora|2|42.333|13.8608
Castiglione a Casauria|1|42.2364|13.896
Catignano|2|42.3463|13.9501
Cepagatti|2|42.3643|14.0718
Città Sant'Angelo|2|42.5181|14.0592
Civitaquana|2|42.326|13.8967
Civitella Casanova|2|42.3649|13.8899
Collecorvino|2|42.4586|14.0143
Corvara|1|42.2749|13.8727
Cugnoli|2|42.3071|13.9327
Elice|2|42.5183|13.9683
Farindola|2|42.4411|13.8234
Lettomanoppello|1|42.2366|14.0369
Loreto Aprutino|2|42.4346|13.9832
Manoppello|1|42.2578|14.06
Montebello di Bertona|2|42.4179|13.8719
Montesilvano|2|42.5136|14.1516
Moscufo|2|42.4281|14.0543
Nocciano|2|42.333|13.9841
Penne|2|42.4582|13.9273
Pescara|2|42.3103|13.9576
Pescosansonesco|1|42.2545|13.8847
Pianella|2|42.396|14.0463
Picciano|2|42.4756|13.9893
Pietranico|2|42.2762|13.9104
Popoli Terme|1|42.1713|13.8328
Roccamorice|1|42.2135|14.0246
Rosciano|2|42.3207|14.0429
Salle|1|42.1769|13.9612
San Valentino in Abruzzo Citeriore|1|42.233|13.9856
Sant'Eufemia a Maiella|1|42.1261|14.0265
Scafa|2|42.2671|13.9998
Serramonacesca|1|42.249|14.0932
Spoltore|2|42.4535|14.141
Tocco da Casauria|1|42.2137|13.9135
Torre de' Passeri|1|42.2419|13.931
Turrivalignani|2|42.2619|14.0267
Vicoli|2|42.3414|13.8971
Villa Celiera|2|42.3818|13.8586
@TE|Teramo
Alba Adriatica|2|42.8343|13.9278
Ancarano|2|42.836|13.7394
Arsita|2|42.5022|13.7828
Atri|2|42.5801|13.9764
Basciano|2|42.5944|13.7396
Bellante|2|42.7418|13.8102
Bisenti|2|42.5291|13.8013
Campli|2|42.7262|13.6863
Canzano|2|42.6468|13.8031
Castel Castagna|2|42.5429|13.7164
Castellalto|2|42.678|13.8216
Castelli|1|42.4879|13.7117
Castiglione Messer Raimondo|2|42.5319|13.8815
Castilenti|2|42.5337|13.917
Cellino Attanasio|2|42.5873|13.8505
Cermignano|2|42.5929|13.7974
Civitella del Tronto|2|42.7734|13.6723
Colledara|2|42.5409|13.6789
Colonnella|2|42.8726|13.865
Controguerra|2|42.8557|13.8193
Corropoli|2|42.8268|13.8352
Cortino|1|42.6224|13.5088
Crognaleto|1|42.5879|13.4896
Fano Adriano|1|42.5521|13.538
Giulianova|2|42.7535|13.9667
Isola del Gran Sasso d'Italia|1|42.5031|13.6595
Martinsicuro|2|42.8851|13.9155
Montefino|2|42.5443|13.8842
Montorio al Vomano|1|42.5827|13.6325
Morro d'Oro|2|42.6637|13.9195
Mosciano Sant'Angelo|2|42.7468|13.8883
Nereto|2|42.8189|13.8161
Notaresco|2|42.6541|13.8947
Penna Sant'Andrea|2|42.5934|13.7722
Pietracamela|1|42.5235|13.5554
Pineto|2|42.6078|14.0671
Rocca Santa Maria|1|42.6863|13.5282
Roseto degli Abruzzi|2|42.6776|14.0145
Sant'Egidio alla Vibrata|2|42.821|13.7179
Sant'Omero|2|42.7867|13.8018
Silvi|2|42.5488|14.1188
Teramo|2|42.6581|13.6996
Torano Nuovo|2|42.823|13.7773
Torricella Sicura|2|42.6576|13.6555
Tortoreto|2|42.804|13.9124
Tossicia|1|42.5449|13.6475
Valle Castellana|1|42.7362|13.4971
#Basilicata
@MT|Matera
Accettura|2|40.491|16.158
Aliano|2|40.3138|16.23
Bernalda|2|40.4129|16.6911
Calciano|2|40.588|16.1924
Cirigliano|2|40.3944|16.1726
Colobraro|2|40.1873|16.425
Craco|2|40.3799|16.4371
Ferrandina|2|40.5012|16.4547
Garaguso|2|40.5484|16.2272
Gorgoglione|2|40.3944|16.1446
Grassano|2|40.6326|16.2828
Grottole|3|40.601|16.3793
Irsina|2|40.7496|16.2358
Matera|3|40.4476|16.4736
Miglionico|3|40.5684|16.5025
Montalbano Jonico|2|40.2884|16.5682
Montescaglioso|3|40.5522|16.6669
Nova Siri|2|40.1482|16.5389
Oliveto Lucano|2|40.5353|16.1846
Pisticci|2|40.3905|16.5567
Policoro|2|40.2105|16.6764
Pomarico|3|40.5179|16.5459
Rotondella|2|40.1713|16.5256
Salandra|2|40.5275|16.3192
San Giorgio Lucano|2|40.1119|16.388
San Mauro Forte|2|40.4871|16.2481
Scanzano Jonico|2|40.2498|16.698
Stigliano|2|40.4012|16.2316
Tricarico|2|40.6201|16.1436
Tursi|2|40.2452|16.4697
Valsinni|2|40.1699|16.4435
@PZ|Potenza
Abriola|1|40.5079|15.8138
Acerenza|2|40.7921|15.9366
Albano di Lucania|2|40.5844|16.0367
Anzi|1|40.5166|15.9246
Armento|1|40.3077|16.065
Atella|1|40.8803|15.6502
Avigliano|1|40.7297|15.7203
Balvano|1|40.6503|15.5142
Banzi|2|40.8616|16.0138
Baragiano|1|40.6797|15.594
Barile|1|40.9463|15.6727
Bella|1|40.7609|15.5406
Brienza|1|40.4778|15.6302
Brindisi Montagna|2|40.6095|15.9398
Calvello|1|40.476|15.8486
Calvera|2|40.1495|16.1439
Campomaggiore|2|40.566|16.0732
Cancellara|2|40.7302|15.9258
Carbone|2|40.1424|16.0894
Castelgrande|1|40.7866|15.4302
Castelluccio Inferiore|2|40.0039|15.9809
Castelluccio Superiore|2|40.0103|15.9751
Castelmezzano|2|40.5302|16.0466
Castelsaraceno|1|40.1637|15.9919
Castronuovo di Sant'Andrea|2|40.1907|16.1855
Cersosimo|2|40.047|16.3494
Chiaromonte|2|40.124|16.2138
Corleto Perticara|2|40.3835|16.0407
Episcopia|2|40.0748|16.0982
Fardella|2|40.1138|16.1698
Filiano|2|40.8319|15.7163
Forenza|2|40.8596|15.8553
Francavilla in Sinni|2|40.0802|16.2032
Gallicchio|2|40.289|16.1391
Genzano di Lucania|2|40.8491|16.0325
Ginestra|1|40.9298|15.7346
Grumento Nova|1|40.2828|15.8888
Guardia Perticara|2|40.3605|16.0989
Lagonegro|2|40.1283|15.7615
Latronico|2|40.0898|16.0118
Laurenzana|1|40.4605|15.971
Lauria|2|40.0474|15.8366
Lavello|2|41.0456|15.7908
Maratea|2|39.9967|15.7224
Marsico Nuovo|1|40.423|15.7349
Marsicovetere|1|40.3766|15.8245
Maschito|2|40.9089|15.8295
Melfi|1|40.9961|15.6557
Missanello|2|40.282|16.166
Moliterno|1|40.2419|15.869
Montemilone|2|41.03|15.9693
Montemurro|1|40.2969|15.9913
Muro Lucano|1|40.7525|15.4858
Nemoli|2|40.0675|15.8003
Noepoli|2|40.0868|16.3297
Oppido Lucano|2|40.7618|15.9867
Palazzo San Gervasio|2|40.9313|15.9808
Paterno|1|40.3783|15.7328
Pescopagano|1|40.8356|15.3989
Picerno|1|40.6385|15.6359
Pietragalla|2|40.7475|15.8806
Pietrapertosa|2|40.518|16.0632
Pignola|1|40.5736|15.7835
Potenza|1|40.5183|15.821
Rapolla|1|40.9757|15.6713
Rapone|1|40.8467|15.5012
Rionero in Vulture|1|40.9262|15.6694
Ripacandida|1|40.9118|15.7248
Rivello|2|40.078|15.7561
Roccanova|2|40.212|16.2032
Rotonda|2|39.9528|16.0391
Ruoti|1|40.718|15.679
Ruvo del Monte|1|40.8488|15.5414
San Chirico Nuovo|2|40.6767|16.0785
San Chirico Raparo|2|40.1907|16.0763
San Costantino Albanese|2|40.0358|16.3047
San Fele|1|40.8193|15.5384
San Martino d'Agri|1|40.2397|16.0531
San Paolo Albanese|2|40.0367|16.3346
San Severino Lucano|2|40.0206|16.1379
Sant'Angelo Le Fratte|1|40.5459|15.559
Sant'Arcangelo|2|40.2473|16.2712
Sarconi|1|40.2479|15.8904
Sasso di Castalda|1|40.4883|15.678
Satriano di Lucania|1|40.5439|15.6383
Savoia di Lucania|1|40.5698|15.5526
Senise|2|40.1472|16.2895
Spinoso|1|40.2697|15.9668
Teana|2|40.1248|16.1518
Terranova di Pollino|2|39.9781|16.2963
Tito|1|40.5836|15.6755
Tolve|2|40.6942|16.0163
Tramutola|1|40.3166|15.7911
Trecchina|2|40.0257|15.7768
Trivigno|2|40.581|15.9899
Vaglio Basilicata|2|40.6659|15.9201
Venosa|2|40.9613|15.8149
Vietri di Potenza|1|40.5986|15.5072
Viggianello|2|39.9732|16.0854
Viggiano|1|40.3407|15.9008
#Calabria
@CZ|Catanzaro
Albi|2|39.025|16.5964
Amaroni|1|38.7931|16.4481
Amato|1|38.9418|16.4622
Andali|2|39.0134|16.7684
Argusto|1|38.6808|16.4354
Badolato|2|38.5687|16.5246
Belcastro|2|39.018|16.7864
Borgia|1|38.8262|16.5088
Botricello|2|38.932|16.8583
Caraffa di Catanzaro|1|38.8813|16.4856
Cardinale|1|38.6423|16.3875
Carlopoli|1|39.0567|16.4549
Catanzaro|2|38.83|16.4316
Cenadi|1|38.7195|16.4172
Centrache|1|38.729|16.4321
Cerva|2|39.0188|16.7427
Chiaravalle Centrale|1|38.6804|16.4106
Cicala|2|39.0222|16.4861
Conflenti|1|39.0717|16.2845
Cortale|1|38.8401|16.4096
Cropani|2|38.9678|16.7813
Curinga|1|38.8262|16.3134
Davoli|2|38.6474|16.4862
Decollatura|1|39.0478|16.3551
Falerna|1|38.9956|16.1626
Feroleto Antico|1|38.9611|16.3883
Fossato Serralta|2|38.9963|16.5796
Gagliato|1|38.677|16.4626
Gasperina|2|38.7396|16.5074
Gimigliano|2|38.9745|16.5305
Girifalco|1|38.8234|16.4264
Gizzeria|1|38.98|16.2033
Guardavalle|2|38.505|16.5035
Isca sullo Ionio|2|38.6013|16.5196
Jacurso|1|38.8462|16.38
Lamezia Terme|1|38.9645|16.3021
Magisano|2|39.0134|16.6279
Maida|1|38.8588|16.3648
Marcedusa|2|39.0278|16.8363
Marcellinara|1|38.9281|16.4931
Martirano|1|39.0817|16.2485
Martirano Lombardo|1|39.0749|16.2328
Miglierina|1|38.949|16.4719
Montauro|2|38.7488|16.5129
Montepaone|2|38.7215|16.499
Motta Santa Lucia|1|39.0919|16.2924
Nocera Terinese|1|39.0369|16.1607
Olivadi|1|38.7256|16.4237
Palermiti|1|38.7485|16.4522
Pentone|2|38.9858|16.5825
Petrizzi|1|38.7014|16.473
Petronà|2|39.0437|16.7559
Pianopoli|1|38.9539|16.3881
Platania|1|39.0054|16.3201
San Floro|1|38.838|16.5187
San Mango d'Aquino|1|39.0603|16.1937
San Pietro a Maida|1|38.8468|16.3435
San Pietro Apostolo|1|39.0044|16.4684
San Sostene|2|38.6379|16.4871
San Vito sullo Ionio|1|38.7118|16.4097
Sant'Andrea Apostolo dello Ionio|2|38.6226|16.5283
Santa Caterina dello Ionio|2|38.5327|16.522
Satriano|2|38.6669|16.4812
Sellia|2|38.9823|16.6297
Sellia Marina|2|38.8996|16.7443
Serrastretta|1|39.0132|16.4163
Sersale|2|39.0109|16.7269
Settingiano|1|38.9114|16.5139
Simeri Crichi|2|38.9096|16.656
Sorbo San Basile|2|39.0194|16.5691
Soverato|1|38.6877|16.55
Soveria Mannelli|1|39.0829|16.3719
Soveria Simeri|2|38.9466|16.6801
Squillace|1|38.7795|16.5122
Stalettì|2|38.7655|16.5376
Taverna|2|39.0218|16.5818
Tiriolo|2|38.9433|16.5083
Torre di Ruggiero|1|38.6534|16.3728
Vallefiorita|1|38.7764|16.461
Zagarise|2|38.9992|16.6632
@CS|Cosenza
Acquaformosa|2|39.7231|16.0899
Acquappesa|2|39.4937|15.9521
Acri|2|39.493|16.3849
Aiello Calabro|1|39.1175|16.1667
Aieta|2|39.9286|15.824
Albidona|2|39.9241|16.4699
Alessandria del Carretto|2|39.9581|16.3795
Altilia|1|39.1305|16.2527
Altomonte|2|39.6979|16.1271
Amantea|1|39.1332|16.0746
Amendolara|2|39.9524|16.5823
Aprigliano|1|39.2417|16.3418
Belmonte Calabro|1|39.1622|16.0825
Belsito|1|39.1772|16.2883
Belvedere Marittimo|2|39.618|15.8619
Bianchi|1|39.1009|16.4101
Bisignano|1|39.5002|16.2745
Bocchigliero|2|39.4198|16.749
Bonifati|2|39.5853|15.9003
Buonvicino|2|39.6902|15.884
Calopezzati|2|39.5607|16.8012
Caloveto|2|39.5059|16.7595
Campana|2|39.4124|16.8226
Canna|2|40.0939|16.5043
Cariati|2|39.4963|16.9474
Carolei|1|39.2563|16.2201
Carpanzano|1|39.1475|16.3033
Casali del Manco|1|39.2948|16.4501
Cassano all'Ionio|2|39.785|16.3159
Castiglione Cosentino|1|39.3516|16.2844
Castrolibero|1|39.3081|16.1944
Castroregio|2|39.9924|16.4776
Castrovillari|2|39.8155|16.2028
Celico|1|39.3101|16.3399
Cellara|1|39.2185|16.3348
Cerchiara di Calabria|2|39.8604|16.3828
Cerisano|1|39.2761|16.1754
Cervicati|1|39.5425|16.1283
Cerzeto|1|39.5078|16.115
Cetraro|2|39.5166|15.9416
Civita|2|39.8288|16.3125
Cleto|1|39.0902|16.1584
Colosimi|1|39.1191|16.3997
Corigliano-Rossano|2|39.6163|16.5779
Cosenza|1|39.5967|16.3331
Cropalati|2|39.5172|16.7265
Crosia|2|39.5676|16.7728
Diamante|2|39.6777|15.8211
Dipignano|1|39.2375|16.2531
Domanico|1|39.2197|16.2061
Fagnano Castello|2|39.5657|16.0537
Falconara Albanese|1|39.2759|16.0918
Figline Vegliaturo|1|39.2252|16.3303
Firmo|2|39.7214|16.1702
Fiumefreddo Bruzio|1|39.2344|16.0695
Francavilla Marittima|2|39.8178|16.3866
Frascineto|2|39.8364|16.262
Fuscaldo|2|39.4143|16.0298
Grimaldi|1|39.142|16.2357
Grisolia|2|39.7245|15.8542
Guardia Piemontese|2|39.4662|15.9993
Lago|1|39.1668|16.1491
Laino Borgo|2|39.9535|15.9737
Laino Castello|2|39.9363|15.9766
Lappano|1|39.3195|16.3122
Lattarico|1|39.4634|16.1378
Longobardi|1|39.2071|16.0765
Longobucco|2|39.4483|16.6105
Lungro|2|39.7423|16.1228
Luzzi|1|39.4461|16.2873
Maierà|2|39.7175|15.8493
Malito|1|39.155|16.2486
Malvito|2|39.5997|16.0533
Mandatoriccio|2|39.4672|16.8348
Mangone|1|39.2056|16.332
Marano Marchesato|1|39.316|16.1738
Marano Principato|1|39.2996|16.1751
Marzi|1|39.1708|16.3064
Mendicino|1|39.2636|16.1954
Mongrassano|1|39.5269|16.1106
Montalto Uffugo|1|39.4048|16.158
Montegiordano|2|40.043|16.5344
Morano Calabro|2|39.8439|16.1356
Mormanno|2|39.8883|15.9868
Mottafollone|2|39.6487|16.0634
Nocara|2|40.0994|16.4819
Oriolo|2|40.0538|16.4461
Orsomarso|2|39.8002|15.9095
Paludi|2|39.5294|16.6816
Panettieri|1|39.06|16.4567
Paola|2|39.3599|16.0396
Papasidero|2|39.8719|15.9056
Parenti|1|39.1622|16.4105
Paterno Calabro|1|39.2285|16.2649
Pedivigliano|1|39.1095|16.3029
Piane Crati|1|39.2341|16.3255
Pietrafitta|1|39.2614|16.3386
Pietrapaola|2|39.4875|16.8158
Plataci|2|39.9004|16.432
Praia a Mare|2|39.9009|15.7793
Rende|1|39.332|16.1844
Rocca Imperiale|2|40.1097|16.5802
Roggiano Gravina|2|39.6182|16.1597
Rogliano|1|39.1788|16.3234
Rose|1|39.3985|16.2872
Roseto Capo Spulico|2|39.987|16.6017
Rota Greca|1|39.4685|16.1126
Rovito|1|39.308|16.3211
San Basile|2|39.8096|16.1633
San Benedetto Ullano|1|39.4271|16.1238
San Cosmo Albanese|2|39.5831|16.4202
San Demetrio Corone|2|39.5699|16.3615
San Donato di Ninea|2|39.7116|16.0485
San Fili|1|39.3389|16.1435
San Giorgio Albanese|2|39.5818|16.4542
San Giovanni in Fiore|2|39.253|16.6974
San Lorenzo Bellizzi|2|39.8892|16.3303
San Lorenzo del Vallo|2|39.6682|16.2974
San Lucido|1|39.3089|16.0508
San Marco Argentano|1|39.5574|16.1191
San Martino di Finita|1|39.4906|16.1098
San Nicola Arcella|2|39.8482|15.795
San Pietro in Amantea|1|39.1364|16.1116
San Pietro in Guarano|1|39.3421|16.3112
San Sosti|2|39.6609|16.0282
San Vincenzo La Costa|1|39.3652|16.1517
Sangineto|2|39.6048|15.9149
Sant'Agata di Esaro|2|39.6228|15.9838
Santa Caterina Albanese|2|39.5861|16.0705
Santa Domenica Talao|2|39.8195|15.8546
Santa Maria del Cedro|2|39.7462|15.8364
Santa Sofia d'Epiro|2|39.5471|16.3291
Santo Stefano di Rogliano|1|39.1925|16.3182
Saracena|2|39.7768|16.1565
Scala Coeli|2|39.4498|16.8854
Scalea|2|39.8167|15.7905
Scigliano|1|39.1287|16.3082
Serra d'Aiello|1|39.0903|16.1275
Spezzano Albanese|2|39.6688|16.3105
Spezzano della Sila|1|39.2994|16.3394
Tarsia|2|39.6209|16.2717
Terranova da Sibari|2|39.6569|16.3395
Terravecchia|2|39.4649|16.946
Torano Castello|1|39.5063|16.1456
Tortora|2|39.9413|15.8052
Trebisacce|2|39.8701|16.5307
Vaccarizzo Albanese|2|39.5854|16.4329
Verbicaro|2|39.7556|15.9136
Villapiana|2|39.8465|16.4552
Zumpano|1|39.3109|16.2921
@KR|Crotone
Belvedere di Spinello|2|39.2119|16.8893
Caccuri|2|39.2274|16.7786
Carfizzi|2|39.3064|16.9738
Casabona|2|39.2503|16.9607
Castelsilano|2|39.269|16.7675
Cerenzia|2|39.2441|16.7883
Cirò|2|39.3817|17.0614
Cirò Marina|2|39.3691|17.1329
Cotronei|2|39.1583|16.7735
Crotone|2|39.1874|16.8783
Crucoli|2|39.4237|17.0023
Cutro|2|39.0354|16.9793
Isola di Capo Rizzuto|2|38.96|17.0933
Melissa|2|39.3074|17.026
Mesoraca|2|39.0801|16.7896
Pallagorio|2|39.3077|16.911
Petilia Policastro|2|39.1094|16.7887
Rocca di Neto|2|39.1844|17.0091
Roccabernarda|2|39.1361|16.8698
San Mauro Marchesato|2|39.1044|16.9244
San Nicola dell'Alto|2|39.2913|16.9722
Santa Severina|2|39.1479|16.9128
Savelli|2|39.3108|16.7785
Scandale|2|39.1222|16.9641
Strongoli|2|39.264|17.052
Umbriatico|2|39.3545|16.9187
Verzino|2|39.3111|16.8604
@RC|Reggio di Calabria
Africo|1|38.0507|16.1332
Agnana Calabra|1|38.3027|16.2229
Anoia|1|38.4362|16.0806
Antonimina|1|38.2723|16.1484
Ardore|1|38.191|16.1682
Bagaladi|1|38.0267|15.8214
Bagnara Calabra|1|38.2885|15.8078
Benestare|1|38.1854|16.137
Bianco|1|38.0907|16.1493
Bivongi|1|38.4832|16.4531
Bova|1|37.9951|15.9319
Bova Marina|1|37.9306|15.9175
Bovalino|1|38.149|16.174
Brancaleone|1|37.963|16.1004
Bruzzano Zeffirio|1|38.0133|16.0826
Calanna|1|38.1837|15.7231
Camini|1|38.4323|16.482
Campo Calabro|1|38.2161|15.6592
Candidoni|1|38.5055|16.0863
Canolo|1|38.315|16.1998
Caraffa del Bianco|1|38.0927|16.0864
Cardeto|1|38.0846|15.7666
Careri|1|38.1766|16.1178
Casignana|1|38.1019|16.0899
Caulonia|1|38.3814|16.409
Ciminà|1|38.2468|16.1388
Cinquefrondi|1|38.416|16.0974
Cittanova|1|38.3539|16.0806
Condofuri|1|38.0047|15.8574
Cosoleto|1|38.2754|15.928
Delianuova|1|38.2341|15.9178
Feroleto della Chiesa|1|38.4658|16.0642
Ferruzzano|1|38.0387|16.087
Fiumara|1|38.2127|15.6937
Galatro|1|38.4597|16.1108
Gerace|1|38.2723|16.2198
Giffone|1|38.4382|16.15
Gioia Tauro|1|38.424|15.899
Gioiosa Ionica|1|38.3222|16.3026
Grotteria|1|38.3655|16.2649
Laganadi|1|38.1734|15.7414
Laureana di Borrello|1|38.4926|16.0821
Locri|1|38.2385|16.2655
Mammola|1|38.3781|16.2031
Marina di Gioiosa Ionica|1|38.3007|16.3304
Maropati|1|38.4406|16.0992
Martone|1|38.354|16.2883
Melicuccà|1|38.3038|15.8813
Melicucco|1|38.4337|16.0605
Melito di Porto Salvo|1|37.9204|15.7779
Molochio|1|38.3084|16.0319
Monasterace|1|38.4537|16.552
Montebello Jonico|1|37.9828|15.758
Motta San Giovanni|1|38.0032|15.6951
Oppido Mamertina|1|38.2936|15.9841
Palizzi|1|37.9667|15.9867
Palmi|1|38.3574|15.8466
Pazzano|1|38.4758|16.4525
Placanica|1|38.4119|16.4525
Platì|1|38.22|16.0465
Polistena|1|38.4065|16.0775
Portigliola|1|38.2277|16.2022
Reggio di Calabria|1|38.1035|15.6398
Riace|1|38.4183|16.4812
Rizziconi|1|38.412|15.9592
Roccaforte del Greco|1|38.0473|15.8947
Roccella Ionica|1|38.322|16.4009
Roghudi|1|37.9276|15.766
Rosarno|1|38.4873|15.9765
Samo|1|38.0738|16.0583
San Ferdinando|1|38.4832|15.9163
San Giorgio Morgeto|1|38.387|16.1082
San Giovanni di Gerace|1|38.3651|16.2777
San Lorenzo|1|38.011|15.8344
San Luca|1|38.1484|16.066
San Pietro di Caridà|1|38.5237|16.1353
San Procopio|1|38.2812|15.8904
San Roberto|1|38.2113|15.7366
Sant'Agata del Bianco|1|38.0928|16.0831
Sant'Alessio in Aspromonte|1|38.1726|15.7578
Sant'Eufemia d'Aspromonte|1|38.2635|15.8548
Sant'Ilario dello Ionio|1|38.2188|16.1956
Santa Cristina d'Aspromonte|1|38.2554|15.9705
Santo Stefano in Aspromonte|1|38.1692|15.7892
Scido|1|38.2436|15.9327
Scilla|1|38.2507|15.719
Seminara|1|38.3351|15.8713
Serrata|1|38.5129|16.1007
Siderno|1|38.2762|16.2982
Sinopoli|1|38.2638|15.8785
Staiti|1|38.0001|16.0328
Stignano|1|38.4161|16.4703
Stilo|1|38.4766|16.4673
Taurianova|1|38.3551|16.0148
Terranova Sappo Minulio|1|38.3227|16.0075
Varapodio|1|38.3171|15.9844
Villa San Giovanni|1|38.2201|15.6374
@VV|Vibo Valentia
Acquaro|1|38.5548|16.1872
Arena|1|38.5628|16.2099
Briatico|1|38.726|16.0329
Brognaturo|1|38.6013|16.3414
Capistrano|1|38.6923|16.2896
Cessaniti|1|38.6637|16.0268
Dasà|1|38.5649|16.196
Dinami|1|38.5278|16.148
Drapia|1|38.6645|15.9104
Fabrizia|1|38.4871|16.301
Filadelfia|1|38.7838|16.2911
Filandari|1|38.6151|16.0314
Filogaso|1|38.6815|16.2287
Francavilla Angitola|1|38.7802|16.2717
Francica|1|38.6157|16.0993
Gerocarne|1|38.5875|16.2198
Ionadi|1|38.6363|16.0596
Joppolo|1|38.5838|15.8973
Limbadi|1|38.5575|15.9659
Maierato|1|38.705|16.1901
Mileto|1|38.6093|16.0695
Mongiana|1|38.5129|16.3195
Monterosso Calabro|1|38.717|16.2911
Nardodipace|1|38.4723|16.3425
Nicotera|1|38.5546|15.9367
Parghelia|1|38.6817|15.9218
Pizzo|1|38.7354|16.1621
Pizzoni|1|38.6231|16.2519
Polia|1|38.7512|16.3122
Ricadi|1|38.6255|15.8664
Rombiolo|1|38.5918|16.0017
San Calogero|1|38.5756|16.0203
San Costantino Calabro|1|38.6323|16.0739
San Gregorio d'Ippona|1|38.6423|16.102
San Nicola da Crissa|1|38.6636|16.2847
Sant'Onofrio|1|38.695|16.1441
Serra San Bruno|1|38.5746|16.3261
Simbario|1|38.6121|16.3349
Sorianello|1|38.5933|16.2319
Soriano Calabro|1|38.5969|16.2304
Spadola|1|38.6038|16.3371
Spilinga|1|38.6284|15.9062
Stefanaconi|1|38.6779|16.1242
Tropea|1|38.6754|15.8948
Vallelonga|1|38.6473|16.2949
Vazzano|1|38.6329|16.248
Vibo Valentia|1|38.6267|16.0987
Zaccanopoli|1|38.6648|15.9298
Zambrone|1|38.6992|15.9901
Zungri|1|38.6557|15.9832
#Campania
@AV|Avellino
Aiello del Sabato|2|40.8872|14.8194
Altavilla Irpina|2|41.0062|14.7777
Andretta|1|40.9385|15.3277
Aquilonia|1|40.9867|15.4745
Ariano Irpino|1|41.1527|15.0886
Atripalda|2|40.9208|14.8335
Avella|2|40.9589|14.6005
Avellino|2|40.9965|15.1406
Bagnoli Irpino|2|40.8331|15.0725
Baiano|2|40.9525|14.6167
Bisaccia|1|41.0121|15.3748
Bonito|1|41.0977|15.0013
Cairano|1|40.8968|15.3704
Calabritto|1|40.7822|15.224
Calitri|1|40.9021|15.4306
Candida|2|40.9423|14.8752
Caposele|1|40.8164|15.2239
Capriglia Irpina|2|40.9603|14.7772
Carife|1|41.0281|15.2087
Casalbore|1|41.2339|15.0067
Cassano Irpino|2|40.8704|15.0259
Castel Baronia|1|41.0474|15.1887
Castelfranci|1|40.9313|15.0432
Castelvetere sul Calore|2|40.9287|14.9861
Cervinara|2|41.0219|14.6133
Cesinali|2|40.8955|14.8283
Chianche|1|41.0462|14.7896
Chiusano di San Domenico|2|40.9331|14.9163
Contrada|2|40.8665|14.776
Conza della Campania|1|40.8586|15.3361
Domicella|2|40.88|14.5877
Flumeri|1|41.0778|15.1477
Fontanarosa|1|41.0184|15.021
Forino|2|40.862|14.7348
Frigento|1|41.0113|15.0997
Gesualdo|1|41.0067|15.0724
Greci|2|41.2518|15.1691
Grottaminarda|1|41.0697|15.0589
Grottolella|2|40.9727|14.787
Guardia Lombardi|1|40.9537|15.2088
Lacedonia|1|41.0512|15.4239
Lapio|1|40.9811|14.9463
Lauro|2|40.88|14.6295
Lioni|1|40.8765|15.1878
Luogosano|1|40.9856|14.992
Manocalzati|2|40.9419|14.8498
Marzano di Nola|2|40.9027|14.5841
Melito Irpino|1|41.1033|15.052
Mercogliano|2|40.9202|14.7386
Mirabella Eclano|1|41.0449|14.9987
Montaguto|2|41.2487|15.2484
Montecalvo Irpino|1|41.1956|15.0334
Montefalcione|2|40.961|14.8822
Monteforte Irpino|2|40.8919|14.7139
Montefredane|2|40.9624|14.811
Montefusco|1|41.0376|14.8549
Montella|2|40.8439|15.018
Montemarano|2|40.9152|14.9976
Montemiletto|1|41.0113|14.9087
Monteverde|1|40.9989|15.5342
Montoro|2|40.8329|14.7918
Morra De Sanctis|1|40.929|15.2429
Moschiano|2|40.8742|14.6584
Mugnano del Cardinale|2|40.943|14.6356
Nusco|2|40.8869|15.084
Ospedaletto d'Alpinolo|2|40.9387|14.7439
Pago del Vallo di Lauro|2|40.8972|14.6076
Parolise|2|40.9309|14.8818
Paternopoli|1|40.9733|15.032
Petruro Irpino|1|41.0319|14.7975
Pietradefusi|1|41.0442|14.8834
Pietrastornina|2|40.9917|14.7292
Prata di Principato Ultra|2|40.986|14.8375
Pratola Serra|2|40.987|14.8526
Quadrelle|2|40.947|14.6383
Quindici|2|40.8633|14.6475
Rocca San Felice|1|40.9515|15.1644
Roccabascerana|2|41.0184|14.7163
Rotondi|2|41.0312|14.5968
Salza Irpina|2|40.9201|14.8894
San Mango sul Calore|1|40.9581|14.9727
San Martino Valle Caudina|2|41.023|14.6622
San Michele di Serino|2|40.8773|14.8563
San Nicola Baronia|1|41.0585|15.1991
San Potito Ultra|2|40.9281|14.8731
San Sossio Baronia|1|41.0712|15.2005
Sant'Andrea di Conza|1|40.8448|15.3697
Sant'Angelo a Scala|2|40.9746|14.7402
Sant'Angelo all'Esca|1|41.0066|14.993
Sant'Angelo dei Lombardi|1|40.927|15.1775
Santa Lucia di Serino|2|40.8704|14.8759
Santa Paolina|1|41.0217|14.8472
Santo Stefano del Sole|2|40.8939|14.8685
Savignano Irpino|2|41.2285|15.1792
Scampitella|1|41.0925|15.3
Senerchia|2|40.7404|15.201
Serino|2|40.8567|14.8706
Sirignano|2|40.951|14.6316
Solofra|2|40.8291|14.8457
Sorbo Serpico|2|40.9169|14.8871
Sperone|2|40.9524|14.6033
Sturno|1|41.0198|15.1113
Summonte|2|40.9495|14.7448
Taurano|2|40.8841|14.634
Taurasi|1|41.0087|14.9586
Teora|1|40.8528|15.2534
Torella dei Lombardi|1|40.9397|15.115
Torre Le Nocelle|1|41.0231|14.9093
Torrioni|1|41.0335|14.813
Trevico|1|41.0484|15.2334
Tufo|1|41.0103|14.8233
Vallata|1|41.0372|15.2522
Vallesaccarda|1|41.0628|15.2518
Venticano|1|41.0491|14.9176
Villamaina|1|40.9694|15.09
Villanova del Battista|1|41.1208|15.1587
Volturara Irpina|2|40.8781|14.9171
Zungoli|1|41.1253|15.2036
@BN|Benevento
Airola|2|41.061|14.5584
Amorosi|2|41.2029|14.4616
Apice|1|41.1184|14.9149
Apollosa|1|41.0941|14.7053
Arpaia|2|41.0361|14.547
Arpaise|2|41.0298|14.7441
Baselice|2|41.3937|14.9728
Benevento|1|41.2477|14.7059
Bonea|2|41.0752|14.618
Bucciano|2|41.0761|14.5723
Buonalbergo|1|41.2231|14.9798
Calvi|1|41.0716|14.8652
Campolattaro|1|41.2866|14.7294
Campoli del Monte Taburno|1|41.1315|14.6459
Casalduni|1|41.2602|14.6961
Castelfranco in Miscano|2|41.2973|15.0855
Castelpagano|1|41.4017|14.808
Castelpoto|1|41.1409|14.7019
Castelvenere|1|41.2348|14.5465
Castelvetere in Val Fortore|2|41.442|14.9396
Cautano|1|41.1493|14.6381
Ceppaloni|2|41.0445|14.7601
Cerreto Sannita|1|41.2845|14.5589
Circello|1|41.3575|14.8091
Colle Sannita|1|41.3647|14.8332
Cusano Mutri|1|41.3391|14.5073
Dugenta|2|41.1322|14.4524
Durazzano|2|41.0625|14.4475
Faicchio|1|41.278|14.4787
Foglianise|1|41.1601|14.6713
Foiano di Val Fortore|2|41.3518|14.9773
Forchia|2|41.0302|14.5373
Fragneto l'Abate|1|41.2562|14.7824
Fragneto Monforte|1|41.246|14.7606
Frasso Telesino|2|41.1568|14.5278
Ginestra degli Schiavoni|2|41.2799|15.0437
Guardia Sanframondi|1|41.2564|14.5995
Limatola|2|41.1408|14.3929
Melizzano|2|41.1606|14.5053
Moiano|2|41.0796|14.543
Molinara|1|41.2906|14.9103
Montefalcone di Val Fortore|2|41.326|15.0091
Montesarchio|2|41.0639|14.6398
Morcone|1|41.3411|14.6636
Paduli|1|41.1672|14.8836
Pago Veiano|1|41.2479|14.8713
Pannarano|2|41.0102|14.7033
Paolisi|2|41.0371|14.5782
Paupisi|1|41.1953|14.6652
Pesco Sannita|1|41.2336|14.8113
Pietraroja|1|41.3478|14.5496
Pietrelcina|1|41.1994|14.8441
Ponte|1|41.2147|14.6963
Pontelandolfo|1|41.2871|14.6923
Puglianello|2|41.2234|14.4504
Reino|1|41.2919|14.8238
San Bartolomeo in Galdo|2|41.4097|15.0154
San Giorgio del Sannio|1|41.0693|14.8525
San Giorgio La Molara|1|41.2709|14.9201
San Leucio del Sannio|1|41.0744|14.7574
San Lorenzello|1|41.2774|14.5428
San Lorenzo Maggiore|1|41.2512|14.6269
San Lupo|1|41.2601|14.6356
San Marco dei Cavoti|1|41.3106|14.879
San Martino Sannita|1|41.0662|14.8358
San Nazzaro|1|41.0524|14.8564
San Nicola Manfredi|1|41.0718|14.8245
San Salvatore Telesino|2|41.236|14.4991
Sant'Agata de' Goti|2|41.0885|14.5038
Sant'Angelo a Cupolo|1|41.0691|14.8037
Sant'Arcangelo Trimonte|1|41.1655|14.939
Santa Croce del Sannio|1|41.3875|14.7322
Sassinoro|1|41.3747|14.6645
Solopaca|2|41.1946|14.5534
Telese Terme|2|41.2164|14.527
Tocco Caudio|2|41.1252|14.6343
Torrecuso|1|41.1897|14.6801
Vitulano|1|41.174|14.6456
@CE|Caserta
Ailano|2|41.3906|14.2032
Alife|2|41.3261|14.334
Alvignano|2|41.2193|14.3527
Arienzo|2|41.0243|14.4971
Aversa|2|40.9732|14.2049
Baia e Latina|2|41.3029|14.2521
Bellona|2|41.16|14.2323
Caianello|2|41.3002|14.0884
Caiazzo|2|41.1783|14.3649
Calvi Risorta|2|41.2165|14.1287
Camigliano|2|41.1798|14.2095
Cancello ed Arnone|3|41.0741|14.0274
Capodrise|2|41.0441|14.3033
Capriati a Volturno|2|41.4686|14.1454
Capua|2|41.108|14.2097
Carinaro|2|40.9836|14.219
Carinola|2|41.1707|14.0155
Casagiove|2|41.0747|14.3077
Casal di Principe|2|41.0114|14.1248
Casaluce|2|41.0019|14.198
Casapesenna|2|40.9915|14.1361
Casapulla|2|41.0753|14.2897
Caserta|2|41.2035|14.1171
Castel Campagnano|2|41.1816|14.4525
Castel di Sasso|2|41.1923|14.2806
Castel Morrone|2|41.121|14.3547
Castel Volturno|3|41.0343|13.9408
Castello del Matese|1|41.3667|14.3777
Cellole|2|41.2048|13.8543
Cervino|2|41.04|14.424
Cesa|2|40.9644|14.2301
Ciorlano|2|41.4502|14.1583
Conca della Campania|2|41.3523|13.9966
Curti|2|41.0729|14.2739
Dragoni|2|41.2702|14.3098
Falciano del Massico|2|41.1651|13.9495
Fontegreca|2|41.4555|14.1836
Formicola|2|41.2104|14.2328
Francolise|2|41.185|14.0567
Frignano|2|40.9979|14.1794
Gallo Matese|2|41.4645|14.225
Galluccio|2|41.3523|13.9537
Giano Vetusto|2|41.2027|14.1934
Gioia Sannitica|1|41.3001|14.4441
Grazzanise|2|41.0894|14.1003
Gricignano di Aversa|2|40.9801|14.2337
Letino|2|41.453|14.2554
Liberi|2|41.2278|14.29
Lusciano|2|40.97|14.1904
Macerata Campania|2|41.0633|14.2737
Maddaloni|2|41.0399|14.3767
Marcianise|2|41.033|14.2984
Marzano Appio|2|41.32|14.0523
Mignano Monte Lungo|2|41.4059|13.9855
Mondragone|3|41.1141|13.8935
Orta di Atella|2|40.9665|14.268
Parete|2|40.9589|14.1619
Pastorano|2|41.1808|14.1982
Piana di Monte Verna|2|41.1671|14.3337
Piedimonte Matese|1|41.3508|14.368
Pietramelara|2|41.2717|14.188
Pietravairano|2|41.3252|14.1659
Pignataro Maggiore|2|41.1908|14.1723
Pontelatone|2|41.1935|14.2517
Portico di Caserta|2|41.0565|14.2794
Prata Sannita|2|41.4328|14.2027
Pratella|2|41.4058|14.1781
Presenzano|2|41.3766|14.0764
Raviscanina|2|41.3794|14.2335
Recale|2|41.0551|14.304
Riardo|2|41.2627|14.1519
Rocca d'Evandro|2|41.389|13.9081
Roccamonfina|2|41.2884|13.9828
Roccaromana|2|41.274|14.2223
Rocchetta e Croce|2|41.2342|14.1698
Ruviano|2|41.2103|14.4092
San Cipriano d'Aversa|2|40.9988|14.1317
San Felice a Cancello|2|41.0124|14.483
San Gregorio Matese|1|41.3852|14.375
San Marcellino|2|40.9865|14.1753
San Marco Evangelista|2|41.037|14.3363
San Nicola la Strada|2|41.0518|14.3313
San Pietro Infine|2|41.4459|13.9615
San Potito Sannitico|1|41.3377|14.3929
San Prisco|2|41.0871|14.2782
San Tammaro|2|41.0759|14.2317
Sant'Angelo d'Alife|2|41.3592|14.2636
Sant'Arpino|2|40.9595|14.2489
Santa Maria a Vico|2|41.0269|14.4652
Santa Maria Capua Vetere|2|41.0799|14.2564
Santa Maria la Fossa|2|41.0917|14.1282
Sessa Aurunca|2|41.2369|13.9347
Sparanise|2|41.1868|14.0937
Succivo|2|40.968|14.2556
Teano|2|41.2511|14.0672
Teverola|2|40.9956|14.2074
Tora e Piccilli|2|41.3386|14.0225
Trentola Ducenta|2|40.9762|14.1772
Vairano Patenora|2|41.337|14.1311
Valle Agricola|2|41.425|14.255
Valle di Maddaloni|2|41.0795|14.4156
Villa di Briano|2|41|14.1607
Villa Literno|2|41.0099|14.0805
Vitulazio|2|41.1641|14.2169
@NA|Napoli
Acerra|2|40.9461|14.375
Afragola|2|40.926|14.3108
Agerola|3|40.6377|14.5388
Anacapri|3|40.5558|14.2136
Arzano|2|40.916|14.268
Bacoli|2|40.7966|14.0778
Barano d'Ischia|2|40.709|13.9186
Boscoreale|2|40.774|14.4774
Boscotrecase|2|40.7743|14.462
Brusciano|2|40.9232|14.4239
Caivano|2|40.9571|14.3102
Calvizzano|2|40.9057|14.1933
Camposano|2|40.9537|14.5292
Capri|3|40.5488|14.2281
Carbonara di Nola|2|40.8742|14.5786
Cardito|2|40.942|14.2994
Casalnuovo di Napoli|2|40.9148|14.3511
Casamarciano|2|40.9316|14.5535
Casamicciola Terme|2|40.7474|13.9075
Casandrino|2|40.9359|14.2488
Casavatore|2|40.8992|14.2766
Casola di Napoli|3|40.696|14.5334
Casoria|2|40.9046|14.2901
Castellammare di Stabia|3|40.6943|14.4805
Castello di Cisterna|2|40.9151|14.4062
Cercola|2|40.8577|14.3552
Cicciano|2|40.9647|14.5389
Cimitile|2|40.9405|14.5254
Comiziano|2|40.9521|14.5514
Crispano|2|40.9525|14.2899
Ercolano|2|40.8054|14.3471
Forio|2|40.7368|13.8581
Frattamaggiore|2|40.9414|14.2722
Frattaminore|2|40.9557|14.2709
Giugliano in Campania|2|40.9287|14.2007
Gragnano|3|40.69|14.5211
Grumo Nevano|2|40.9382|14.2593
Ischia|2|40.7342|13.9471
Lacco Ameno|2|40.751|13.8901
Lettere|3|40.7049|14.5449
Liveri|2|40.9047|14.5659
Marano di Napoli|2|40.8976|14.1905
Mariglianella|2|40.9295|14.4358
Marigliano|2|40.9249|14.4569
Massa di Somma|2|40.8476|14.3743
Massa Lubrense|3|40.611|14.3451
Melito di Napoli|2|40.9205|14.23
Meta|3|40.6392|14.4182
Monte di Procida|2|40.8009|14.0518
Mugnano di Napoli|2|40.9093|14.2068
Napoli|2|40.8359|14.2488
Nola|2|40.9211|14.5327
Ottaviano|2|40.8498|14.4901
Palma Campania|2|40.8649|14.5487
Piano di Sorrento|3|40.6326|14.4111
Pimonte|3|40.6736|14.5098
Poggiomarino|2|40.8031|14.539
Pollena Trocchia|2|40.8546|14.3795
Pomigliano d'Arco|2|40.9079|14.3862
Pompei|2|40.7491|14.5006
Portici|2|40.819|14.3387
Pozzuoli|2|40.8226|14.1219
Procida|2|40.765|14.0239
Qualiano|2|40.9188|14.1536
Quarto|2|40.8772|14.1402
Roccarainola|2|40.9713|14.561
San Gennaro Vesuviano|2|40.8604|14.5292
San Giorgio a Cremano|2|40.8293|14.3342
San Giuseppe Vesuviano|2|40.8298|14.5044
San Paolo Bel Sito|2|40.9148|14.5467
San Sebastiano al Vesuvio|2|40.8436|14.3699
San Vitaliano|2|40.9272|14.4801
Sant'Agnello|3|40.63|14.3971
Sant'Anastasia|2|40.8669|14.4048
Sant'Antimo|2|40.9457|14.2314
Sant'Antonio Abate|3|40.7237|14.5465
Santa Maria la Carità|3|40.721|14.5128
Saviano|2|40.9056|14.505
Scisciano|2|40.916|14.4857
Serrara Fontana|2|40.7179|13.8935
Somma Vesuviana|2|40.8716|14.4361
Sorrento|3|40.6249|14.3748
Striano|2|40.8159|14.5765
Terzigno|2|40.8124|14.4965
Torre Annunziata|2|40.7525|14.455
Torre del Greco|2|40.7879|14.3683
Trecase|2|40.7709|14.4397
Tufino|2|40.9541|14.5659
Vico Equense|3|40.6623|14.4264
Villaricca|2|40.9216|14.1898
Visciano|2|40.9254|14.5828
Volla|2|40.8784|14.3429
@SA|Salerno
Acerno|2|40.7377|15.0569
Agropoli|3|40.3469|14.9966
Albanella|2|40.4784|15.1166
Alfano|2|40.1775|15.4252
Altavilla Silentina|2|40.5302|15.131
Amalfi|3|40.6337|14.6026
Angri|2|40.7377|14.5723
Aquara|2|40.4439|15.2539
Ascea|3|40.1416|15.1858
Atena Lucana|1|40.4551|15.5573
Atrani|3|40.6369|14.6075
Auletta|2|40.5588|15.4249
Baronissi|2|40.7469|14.77
Battipaglia|2|40.6093|14.9821
Bellizzi|2|40.6202|14.9485
Bellosguardo|2|40.4233|15.3142
Bracigliano|2|40.8235|14.7054
Buccino|1|40.6329|15.3697
Buonabitacolo|1|40.2713|15.62
Caggiano|1|40.5678|15.4934
Calvanico|2|40.7752|14.8279
Camerota|3|40.0325|15.3728
Campagna|2|40.6647|15.1071
Campora|2|40.3054|15.2924
Cannalonga|2|40.2443|15.2937
Capaccio Paestum|3|40.4439|15.04
Casal Velino|3|40.1909|15.1094
Casalbuono|2|40.2157|15.6816
Casaletto Spartano|2|40.1507|15.6187
Caselle in Pittari|2|40.1725|15.5458
Castel San Giorgio|2|40.7837|14.6988
Castel San Lorenzo|2|40.4183|15.2272
Castelcivita|2|40.4942|15.2345
Castellabate|3|40.2761|14.9581
Castelnuovo Cilento|3|40.2195|15.1772
Castelnuovo di Conza|1|40.8206|15.3188
Castiglione del Genovesi|2|40.7255|14.8484
Cava de' Tirreni|3|40.7005|14.7063
Celle di Bulgheria|2|40.0955|15.4027
Centola|3|40.0665|15.312
Ceraso|3|40.1943|15.2561
Cetara|3|40.6482|14.7004
Cicerale|3|40.3438|15.1292
Colliano|1|40.7261|15.2912
Conca dei Marini|3|40.6189|14.5678
Controne|2|40.5096|15.2056
Contursi Terme|2|40.6495|15.2394
Corbara|3|40.7248|14.5928
Corleto Monforte|2|40.4372|15.3796
Cuccaro Vetere|2|40.1617|15.3085
Eboli|2|40.6175|15.0569
Felitto|2|40.3735|15.2431
Fisciano|2|40.7728|14.7994
Furore|3|40.6189|14.5481
Futani|2|40.1507|15.3232
Giffoni Sei Casali|2|40.7191|14.906
Giffoni Valle Piana|2|40.7181|14.9423
Gioi|2|40.2897|15.2181
Giungano|2|40.3947|15.1072
Ispani|2|40.0873|15.5583
Laureana Cilento|3|40.2992|15.0385
Laurino|2|40.3365|15.3372
Laurito|2|40.1686|15.406
Laviano|1|40.7851|15.3073
Lustra|3|40.2883|15.0683
Magliano Vetere|2|40.347|15.2367
Maiori|3|40.6489|14.6401
Mercato San Severino|2|40.7833|14.7557
Minori|3|40.6527|14.6249
Moio della Civitella|2|40.2471|15.2689
Montano Antilia|2|40.1623|15.3655
Monte San Giacomo|2|40.3444|15.5405
Montecorice|3|40.234|14.9847
Montecorvino Pugliano|2|40.6581|14.9446
Montecorvino Rovella|2|40.6959|14.9761
Monteforte Cilento|2|40.3648|15.1949
Montesano sulla Marcellana|1|40.2759|15.7014
Morigerati|2|40.1399|15.5552
Nocera Inferiore|2|40.7472|14.6433
Nocera Superiore|2|40.7416|14.6715
Novi Velia|2|40.2251|15.2884
Ogliastro Cilento|3|40.3524|15.0432
Olevano sul Tusciano|2|40.6689|15.0326
Oliveto Citra|2|40.6908|15.2318
Omignano|3|40.2482|15.0852
Orria|2|40.2997|15.1712
Ottati|2|40.4629|15.3152
Padula|1|40.3416|15.6583
Pagani|2|40.7499|14.6133
Palomonte|2|40.6625|15.2919
Pellezzano|2|40.7252|14.7574
Perdifumo|3|40.266|15.0155
Perito|3|40.2977|15.1477
Pertosa|1|40.5429|15.449
Petina|2|40.5321|15.3735
Piaggine|2|40.3448|15.3787
Pisciotta|3|40.1089|15.2346
Polla|1|40.5171|15.498
Pollica|3|40.1907|15.0572
Pontecagnano Faiano|2|40.6409|14.8819
Positano|3|40.6287|14.4855
Postiglione|2|40.559|15.2324
Praiano|3|40.6111|14.5313
Prignano Cilento|3|40.3309|15.0687
Ravello|3|40.6497|14.6123
Ricigliano|1|40.6685|15.4815
Roccadaspide|2|40.4254|15.1918
Roccagloriosa|2|40.1087|15.4333
Roccapiemonte|2|40.7625|14.6924
Rofrano|2|40.2114|15.4279
Romagnano al Monte|1|40.6272|15.436
Roscigno|2|40.399|15.3459
Rutino|3|40.2997|15.0728
Sacco|2|40.3781|15.378
Sala Consilina|1|40.3982|15.5964
Salento|3|40.2486|15.1901
Salerno|2|40.4194|15.3108
Salvitelle|1|40.5909|15.4588
San Cipriano Picentino|2|40.72|14.87
San Giovanni a Piro|2|40.0503|15.451
San Gregorio Magno|1|40.6565|15.4036
San Mango Piemonte|2|40.7019|14.8337
San Marzano sul Sarno|2|40.7752|14.5874
San Mauro Cilento|3|40.2264|15.0441
San Mauro la Bruca|3|40.1229|15.2897
San Pietro al Tanagro|2|40.4568|15.4807
San Rufo|2|40.4345|15.4637
San Valentino Torio|2|40.793|14.598
Sant'Angelo a Fasanella|2|40.4568|15.3415
Sant'Arsenio|2|40.4729|15.4846
Sant'Egidio del Monte Albino|2|40.7338|14.597
Santa Marina|2|40.1043|15.5405
Santomenna|1|40.8083|15.3215
Sanza|2|40.2446|15.5527
Sapri|2|40.0751|15.6298
Sarno|2|40.8108|14.6198
Sassano|2|40.3377|15.5631
Scafati|2|40.75|14.5269
Scala|3|40.6536|14.6078
Serramezzana|3|40.2439|15.0321
Serre|2|40.5825|15.1856
Sessa Cilento|3|40.2592|15.0758
Siano|2|40.804|14.6884
Sicignano degli Alburni|2|40.581|15.3004
Stella Cilento|3|40.2318|15.0929
Stio|2|40.31|15.2527
Teggiano|2|40.3792|15.5405
Torchiara|3|40.323|15.0524
Torraca|2|40.1125|15.6352
Torre Orsaia|2|40.1333|15.4733
Tortorella|2|40.1422|15.6057
Tramonti|3|40.6997|14.6415
Trentinara|2|40.4004|15.1075
Valle dell'Angelo|2|40.3438|15.3685
Vallo della Lucania|2|40.2297|15.2658
Valva|1|40.7382|15.2695
Vibonati|2|40.1002|15.5831
Vietri sul Mare|3|40.6715|14.7286
#Emilia-Romagna
@BO|Bologna
Alto Reno Terme|3|44.124|10.9373
Anzola dell'Emilia|3|44.5467|11.1933
Argelato|3|44.6416|11.3478
Baricella|3|44.6462|11.5333
Bentivoglio|3|44.6358|11.4172
Bologna|3|44.4938|11.343
Borgo Tossignano|2|44.2757|11.5898
Budrio|3|44.5379|11.5355
Calderara di Reno|3|44.5631|11.2717
Camugnano|3|44.1705|11.0888
Casalecchio di Reno|3|44.476|11.2757
Casalfiumanese|2|44.2969|11.624
Castel d'Aiano|3|44.2759|10.9994
Castel del Rio|2|44.2143|11.5041
Castel di Casio|3|44.163|11.0358
Castel Guelfo di Bologna|2|44.4311|11.6774
Castel Maggiore|3|44.5757|11.3648
Castel San Pietro Terme|2|44.4013|11.5855
Castello d'Argile|3|44.6813|11.2962
Castenaso|3|44.5089|11.4698
Castiglione dei Pepoli|3|44.1425|11.1665
Crevalcore|3|44.7206|11.1498
Dozza|2|44.3594|11.6289
Fontanelice|2|44.2601|11.5597
Gaggio Montano|3|44.197|10.9329
Galliera|3|44.7492|11.4265
Granarolo dell'Emilia|3|44.5532|11.4432
Grizzana Morandi|3|44.2574|11.1529
Imola|2|44.3535|11.7141
Lizzano in Belvedere|3|44.1618|10.894
Loiano|3|44.2662|11.3255
Malalbergo|3|44.7187|11.5322
Marzabotto|3|44.341|11.2048
Medicina|2|44.4767|11.6383
Minerbio|3|44.6242|11.4907
Molinella|3|44.6209|11.6702
Monghidoro|3|44.2199|11.3187
Monte San Pietro|3|44.4284|11.1512
Monterenzio|2|44.3269|11.4061
Monzuno|3|44.2793|11.2664
Mordano|2|44.3974|11.8109
Ozzano dell'Emilia|2|44.445|11.4761
Pianoro|3|44.393|11.3423
Pieve di Cento|3|44.7132|11.3066
Sala Bolognese|3|44.6296|11.2727
San Benedetto Val di Sambro|3|44.2153|11.2329
San Giorgio di Piano|3|44.6468|11.3754
San Giovanni in Persiceto|3|44.639|11.1871
San Lazzaro di Savena|3|44.4716|11.4049
San Pietro in Casale|3|44.6991|11.4029
Sant'Agata Bolognese|3|44.6642|11.134
Sasso Marconi|3|44.3996|11.2476
Valsamoggia|3|44.4398|11.0593
Vergato|3|44.2827|11.1073
Zola Predosa|3|44.4897|11.2183
@FE|Ferrara
Argenta|2|44.6143|11.8338
Bondeno|3|44.8862|11.4108
Cento|3|44.7274|11.2903
Codigoro|3|44.8316|12.1095
Comacchio|3|44.6964|12.1804
Copparo|3|44.8942|11.8279
Ferrara|3|44.7668|11.8279
Fiscaglia|3|44.7941|12.0295
Goro|3|44.8509|12.2949
Jolanda di Savoia|3|44.8824|11.9793
Lagosanto|3|44.762|12.1428
Masi Torello|3|44.7946|11.8018
Mesola|3|44.9208|12.2292
Ostellato|3|44.7457|11.9435
Poggio Renatico|3|44.766|11.4901
Portomaggiore|3|44.6993|11.8041
Riva del Po|3|44.9605|11.8944
Terre del Reno|3|44.8122|11.4044
Tresignana|3|44.8289|11.8789
Vigarano Mainarda|3|44.8434|11.4944
Voghiera|3|44.7591|11.7511
@FC|Forli'-Cesena
Bagno di Romagna|2|43.8352|11.9596
Bertinoro|2|44.1487|12.1342
Borghi|2|44.0316|12.3544
Castrocaro Terme e Terra del Sole|2|44.1824|11.9556
Cesena|2|44.1364|12.2422
Cesenatico|2|44.1999|12.397
Civitella di Romagna|2|44.0072|11.9413
Dovadola|2|44.1226|11.8883
Forlì|2|44.2227|12.0413
Forlimpopoli|2|44.1873|12.1259
Galeata|2|43.9967|11.912
Gambettola|2|44.1169|12.3388
Gatteo|2|44.1095|12.386
Longiano|2|44.0744|12.3275
Meldola|2|44.1267|12.0612
Mercato Saraceno|2|43.9567|12.1958
Modigliana|2|44.1612|11.7935
Montiano|2|44.083|12.3044
Portico e San Benedetto|2|44.0037|11.7202
Predappio|2|44.1022|11.9816
Premilcuore|2|43.9759|11.7775
Rocca San Casciano|2|44.0591|11.8421
Roncofreddo|2|44.0422|12.3183
San Mauro Pascoli|2|44.1065|12.4149
Santa Sofia|2|43.9473|11.9085
Sarsina|2|43.9188|12.1433
Savignano sul Rubicone|2|44.0925|12.3991
Sogliano al Rubicone|2|44.0047|12.3005
Tredozio|2|44.081|11.7442
Verghereto|2|43.793|12.0039
@MO|Modena
Bastiglia|3|44.727|10.9986
Bomporto|3|44.7298|11.0384
Campogalliano|3|44.6905|10.8407
Camposanto|3|44.7901|11.1378
Carpi|3|44.7836|10.8855
Castelfranco Emilia|3|44.595|11.0529
Castelnuovo Rangone|3|44.5513|10.935
Castelvetro di Modena|2|44.5035|10.9433
Cavezzo|3|44.8365|11.0294
Concordia sulla Secchia|3|44.9132|10.9833
Fanano|3|44.2077|10.7938
Finale Emilia|3|44.8346|11.2939
Fiorano Modenese|2|44.5391|10.8118
Fiumalbo|3|44.18|10.6477
Formigine|2|44.5751|10.847
Frassinoro|2|44.2956|10.5702
Guiglia|3|44.4241|10.9621
Lama Mocogno|3|44.3073|10.7318
Maranello|2|44.5255|10.8664
Marano sul Panaro|3|44.4559|10.9664
Medolla|3|44.8467|11.0676
Mirandola|3|44.8872|11.0661
Modena|3|44.5385|10.936
Montecreto|3|44.246|10.7176
Montefiorino|3|44.3529|10.6256
Montese|3|44.2685|10.9412
Nonantola|3|44.6776|11.0436
Novi di Modena|3|44.8934|10.9013
Palagano|3|44.321|10.6461
Pavullo nel Frignano|3|44.3397|10.8341
Pievepelago|2|44.2048|10.6166
Polinago|3|44.3448|10.7235
Prignano sulla Secchia|3|44.4384|10.6919
Ravarino|3|44.7212|11.0984
Riolunato|3|44.23|10.6516
San Cesario sul Panaro|3|44.5611|11.0332
San Felice sul Panaro|3|44.8394|11.1432
San Possidonio|3|44.8921|10.9961
San Prospero|3|44.7897|11.0221
Sassuolo|2|44.541|10.7829
Savignano sul Panaro|3|44.4805|11.0351
Serramazzoni|3|44.4225|10.7891
Sestola|3|44.2305|10.7714
Soliera|3|44.7381|10.9244
Spilamberto|3|44.5334|11.0241
Vignola|3|44.4784|11.0091
Zocca|3|44.3473|10.9904
@PR|Parma
Albareto|2|44.4466|9.7
Bardi|3|44.6322|9.7312
Bedonia|2|44.5036|9.6299
Berceto|3|44.5106|9.9897
Bore|3|44.7187|9.7921
Borgo Val di Taro|2|44.4871|9.7658
Busseto|3|44.9806|10.0421
Calestano|3|44.6007|10.123
Collecchio|3|44.752|10.2167
Colorno|3|44.9265|10.3771
Compiano|2|44.496|9.6621
Corniglio|3|44.4759|10.0889
Felino|3|44.6966|10.2372
Fidenza|3|44.8665|10.0612
Fontanellato|3|44.8817|10.1722
Fontevivo|3|44.8588|10.1752
Fornovo di Taro|3|44.692|10.101
Langhirano|3|44.6131|10.2661
Lesignano de' Bagni|3|44.6434|10.3005
Medesano|3|44.7567|10.1407
Monchio delle Corti|2|44.413|10.1242
Montechiarugolo|3|44.6934|10.4225
Neviano degli Arduini|3|44.5824|10.3157
Noceto|3|44.8099|10.1773
Palanzano|2|44.4374|10.1945
Parma|3|44.8014|10.3281
Pellegrino Parmense|3|44.7332|9.9276
Polesine Zibello|3|45.0108|10.0987
Roccabianca|3|45.0094|10.2194
Sala Baganza|3|44.7139|10.2263
Salsomaggiore Terme|3|44.8148|9.9796
San Secondo Parmense|3|44.9202|10.2296
Sissa Trecasali|3|44.9456|10.2799
Solignano|3|44.6131|9.9755
Soragna|3|44.9263|10.1242
Sorbolo Mezzani|3|44.9001|10.4422
Terenzo|3|44.61|10.0897
Tizzano Val Parma|3|44.5205|10.1992
Tornolo|2|44.4853|9.6253
Torrile|3|44.8989|10.3395
Traversetolo|3|44.6392|10.3818
Valmozzola|3|44.5855|9.8692
Varano de' Melegari|3|44.6881|10.0115
Varsi|3|44.6622|9.8467
@PC|Piacenza
Agazzano|3|44.9444|9.5177
Alseno|3|44.8984|9.9614
Alta Val Tidone|3|44.92|9.3472
Besenzone|3|44.9864|9.9549
Bettola|3|44.7764|9.6063
Bobbio|3|44.7693|9.3863
Borgonovo Val Tidone|3|45.0144|9.4435
Cadeo|3|44.9754|9.8311
Calendasco|3|45.0873|9.5961
Caorso|3|45.0496|9.8744
Carpaneto Piacentino|3|44.9152|9.7881
Castel San Giovanni|3|45.0591|9.4342
Castell'Arquato|3|44.8512|9.8671
Castelvetro Piacentino|3|45.1003|9.9867
Cerignale|3|44.6779|9.3508
Coli|3|44.7448|9.4146
Corte Brugnatella|3|44.7158|9.3603
Cortemaggiore|3|44.9964|9.9311
Farini|3|44.7128|9.5693
Ferriere|3|44.6441|9.4975
Fiorenzuola d'Arda|3|44.9281|9.9107
Gazzola|3|44.9601|9.549
Gossolengo|3|45|9.6138
Gragnano Trebbiense|3|45.0132|9.569
Gropparello|3|44.8327|9.7299
Lugagnano Val d'Arda|3|44.822|9.8285
Monticelli d'Ongina|3|45.0895|9.9332
Morfasso|3|44.7227|9.7029
Ottone|3|44.6232|9.3327
Piacenza|3|44.8476|9.6665
Pianello Val Tidone|3|44.9467|9.4052
Piozzano|3|44.9263|9.4961
Podenzano|3|44.9564|9.685
Ponte dell'Olio|3|44.8674|9.6423
Pontenure|3|44.9992|9.7886
Rivergaro|3|44.9103|9.5965
Rottofreno|3|45.0575|9.5478
San Giorgio Piacentino|3|44.9542|9.7369
San Pietro in Cerro|3|45.0214|9.9499
Sarmato|3|45.0598|9.4914
Travo|3|44.8625|9.5454
Vernasca|3|44.7994|9.8307
Vigolzone|3|44.9147|9.6694
Villanova sull'Arda|3|45.026|9.9971
Zerba|3|44.6662|9.2872
Ziano Piacentino|3|45.0015|9.4016
@RA|Ravenna
Alfonsine|2|44.5054|12.0412
Bagnacavallo|2|44.4161|11.9765
Bagnara di Romagna|2|44.3892|11.8265
Brisighella|2|44.2221|11.7722
Casola Valsenio|2|44.2232|11.6231
Castel Bolognese|2|44.3205|11.7993
Cervia|2|44.261|12.3495
Conselice|2|44.5128|11.8292
Cotignola|2|44.3838|11.9402
Faenza|2|44.2856|11.8832
Fusignano|2|44.4675|11.9602
Lugo|2|44.4189|11.9082
Massa Lombarda|2|44.4474|11.8261
Ravenna|3|44.3641|12.059
Riolo Terme|2|44.2771|11.7245
Russi|2|44.3701|12.0304
Sant'Agata sul Santerno|2|44.4422|11.8601
Solarolo|2|44.3604|11.8445
@RE|Reggio nell'Emilia
Albinea|3|44.6202|10.6019
Bagnolo in Piano|3|44.763|10.6733
Baiso|3|44.4968|10.6017
Bibbiano|3|44.6634|10.4727
Boretto|3|44.9019|10.5543
Brescello|3|44.9012|10.5157
Cadelbosco di Sopra|3|44.7633|10.5952
Campagnola Emilia|3|44.8393|10.7571
Campegine|3|44.7817|10.5284
Canossa|3|44.5536|10.4119
Carpineti|3|44.456|10.5197
Casalgrande|2|44.588|10.7373
Casina|3|44.5103|10.5016
Castellarano|2|44.5103|10.7286
Castelnovo di Sotto|3|44.8109|10.5633
Castelnovo ne' Monti|2|44.4356|10.4033
Cavriago|3|44.6942|10.5269
Correggio|3|44.7706|10.7798
Fabbrico|3|44.8721|10.8101
Gattatico|3|44.7957|10.4446
Gualtieri|3|44.905|10.6302
Guastalla|3|44.9212|10.654
Luzzara|3|44.9617|10.6871
Montecchio Emilia|3|44.7005|10.4464
Novellara|3|44.843|10.7275
Poviglio|3|44.8417|10.5416
Quattro Castella|3|44.6356|10.4724
Reggio nell'Emilia|3|44.6087|10.5948
Reggiolo|3|44.9185|10.8042
Rio Saliceto|3|44.81|10.8031
Rolo|3|44.8867|10.8582
Rubiera|3|44.6532|10.7811
San Martino in Rio|3|44.7328|10.784
San Polo d'Enza|3|44.6259|10.4223
Sant'Ilario d'Enza|3|44.7605|10.4499
Scandiano|3|44.5993|10.6878
Toano|2|44.3764|10.5612
Ventasso|2|44.3688|10.2693
Vetto|2|44.4842|10.3375
Vezzano sul Crostolo|3|44.6026|10.5469
Viano|2|44.5437|10.6216
Villa Minozzo|2|44.3651|10.466
@RN|Rimini
Bellaria-Igea Marina|2|44.1421|12.4697
Casteldelci|2|43.7912|12.1551
Cattolica|2|43.964|12.7442
Coriano|2|43.9652|12.6024
Gemmano|2|43.9042|12.5831
Maiolo|2|43.874|12.3111
Misano Adriatico|2|43.9775|12.6987
Mondaino|2|43.8557|12.6714
Montecopiolo|2|43.892|12.5102
Montefiore Conca|2|43.8902|12.6103
Montegridolfo|2|43.859|12.6885
Montescudo-Monte Colombo|2|43.9314|12.5422
Morciano di Romagna|2|43.9137|12.6461
Novafeltria|2|43.8957|12.2904
Pennabilli|2|43.8171|12.2653
Poggio Torriana|2|43.9998|12.3927
Riccione|2|43.9983|12.6474
Rimini|2|43.9471|12.6308
Saludecio|2|43.8727|12.6685
San Clemente|2|43.9322|12.6257
San Giovanni in Marignano|2|43.9387|12.7125
San Leo|2|43.897|12.3436
Sant'Agata Feltria|2|43.8643|12.208
Santarcangelo di Romagna|2|44.0634|12.4467
Sassofeltrio|2|43.8924|12.5093
Talamello|2|43.905|12.2859
Verucchio|2|43.9836|12.4212
#Friuli-Venezia Giulia
@GO|Gorizia
Capriva del Friuli|2|45.9414|13.5136
Cormons|2|45.9578|13.471
Doberdò del Lago-Doberdob|3|45.8446|13.5401
Dolegna del Collio|2|46.0313|13.4793
Farra d'Isonzo|2|45.908|13.5165
Fogliano Redipuglia|3|45.8565|13.4929
Gorizia|2|45.9441|13.6252
Gradisca d'Isonzo|3|45.8896|13.5003
Grado|3|45.6777|13.3864
Mariano del Friuli|3|45.9161|13.4587
Medea|3|45.9177|13.4225
Monfalcone|3|45.8049|13.5331
Moraro|2|45.9306|13.4965
Mossa|2|45.9386|13.5482
Romans d'Isonzo|3|45.8906|13.4382
Ronchi dei Legionari|3|45.8278|13.5018
Sagrado|3|45.8758|13.4855
San Canzian d'Isonzo|3|45.7986|13.4661
San Floriano del Collio-Števerjan|2|45.9831|13.5871
San Lorenzo Isontino|2|45.9312|13.5285
San Pier d'Isonzo|3|45.8469|13.4601
Savogna d'Isonzo-Sovodnje ob Soči|2|45.9059|13.5749
Staranzano|3|45.8058|13.5003
Turriaco|3|45.82|13.4467
Villesse|3|45.8639|13.4402
@PN|Pordenone
Andreis|1|46.2005|12.6137
Arba|2|46.145|12.7914
Aviano|2|46.0685|12.5891
Azzano Decimo|3|45.8814|12.7143
Barcis|1|46.1903|12.5582
Brugnera|2|45.9035|12.526
Budoia|2|46.043|12.5326
Caneva|2|45.9687|12.4481
Casarsa della Delizia|3|45.9559|12.8427
Castelnovo del Friuli|1|46.2138|12.8831
Cavasso Nuovo|1|46.1966|12.7703
Chions|3|45.8472|12.7111
Cimolais|2|46.2876|12.4381
Claut|2|46.2667|12.5157
Clauzetto|1|46.2299|12.9156
Cordenons|2|46.0037|12.7187
Cordovado|3|45.8458|12.8807
Erto e Casso|2|46.2771|12.3596
Fanna|1|46.1871|12.7531
Fiume Veneto|3|45.9279|12.7322
Fontanafredda|2|45.9734|12.5691
Frisanco|1|46.2128|12.7271
Maniago|1|46.171|12.7074
Meduno|1|46.2168|12.7859
Montereale Valcellina|1|46.1605|12.6621
Morsano al Tagliamento|3|45.8581|12.9293
Pasiano di Pordenone|3|45.8498|12.6265
Pinzano al Tagliamento|2|46.1831|12.9454
Polcenigo|2|46.0307|12.5016
Porcia|2|45.9466|12.6018
Pordenone|2|45.9562|12.6597
Prata di Pordenone|2|45.8933|12.5963
Pravisdomini|3|45.8189|12.6944
Roveredo in Piano|2|46.0111|12.6203
Sacile|2|45.9539|12.5034
San Giorgio della Richinvelda|2|46.0395|12.8823
San Martino al Tagliamento|2|46.0208|12.8638
San Quirino|2|46.0362|12.68
San Vito al Tagliamento|3|45.9145|12.8566
Sequals|2|46.1655|12.8288
Sesto al Reghena|3|45.8476|12.8155
Spilimbergo|2|46.1113|12.9016
Tramonti di Sopra|2|46.3089|12.7885
Tramonti di Sotto|2|46.2849|12.7956
Travesio|1|46.1965|12.871
Vajont|1|46.1461|12.6974
Valvasone Arzene|2|45.9952|12.8663
Vito d'Asio|1|46.2278|12.9383
Vivaro|2|46.078|12.7758
Zoppola|2|45.9663|12.7716
@TS|Trieste
Duino Aurisina-Devin Nabrežina|3|45.7704|13.6753
Monrupino-Repentabor|3|45.7178|13.7974
Muggia|3|45.5958|13.7829
San Dorligo della Valle-Dolina|3|45.6126|13.8535
Sgonico-Zgonik|3|45.736|13.7482
Trieste|3|45.6505|13.7931
@UD|Udine
Aiello del Friuli|3|45.8729|13.3636
Amaro|1|46.374|13.0954
Ampezzo|2|46.4171|12.7903
Aquileia|3|45.7696|13.3698
Arta Terme|2|46.4724|13.0267
Artegna|1|46.2391|13.1557
Attimis|1|46.1893|13.3071
Bagnaria Arsa|3|45.8836|13.285
Basiliano|3|46.0163|13.1071
Bertiolo|3|45.9427|13.0492
Bicinicco|3|45.9357|13.2512
Bordano|1|46.3153|13.1046
Buja|1|46.2067|13.1186
Buttrio|2|46.0104|13.3338
Camino al Tagliamento|3|45.927|12.9451
Campoformido|2|46.0193|13.1624
Campolongo Tapogliano|3|45.8685|13.4038
Carlino|3|45.8023|13.1882
Cassacco|2|46.1736|13.1879
Castions di Strada|3|45.9083|13.1853
Cavazzo Carnico|2|46.3675|13.04
Cercivento|2|46.5273|12.9892
Cervignano del Friuli|3|45.8228|13.3364
Chiopris-Viscone|3|45.9314|13.3811
Chiusaforte|2|46.4083|13.309
Cividale del Friuli|2|46.0936|13.4303
Codroipo|3|45.9611|12.979
Colloredo di Monte Albano|2|46.1664|13.139
Comeglians|2|46.5152|12.8678
Corno di Rosazzo|2|45.9971|13.4416
Coseano|2|46.097|13.0194
Dignano|2|46.085|12.9393
Dogna|2|46.4479|13.315
Drenchia|2|46.1742|13.6365
Enemonzo|2|46.4109|12.8787
Faedis|2|46.1503|13.3464
Fagagna|2|46.1134|13.0846
Fiumicello Villa Vicentina|3|45.7836|13.413
Flaibano|2|46.0583|12.9836
Forgaria nel Friuli|1|46.2228|12.9735
Forni Avoltri|3|46.5868|12.7769
Forni di Sopra|2|46.4202|12.5856
Forni di Sotto|2|46.395|12.6702
Gemona del Friuli|1|46.277|13.1401
Gonars|3|45.8959|13.2371
Grimacco|2|46.1674|13.5812
Latisana|3|45.7785|12.9962
Lauco|2|46.424|12.933
Lestizza|3|45.9549|13.1417
Lignano Sabbiadoro|3|45.6894|13.1386
Lusevera|1|46.2758|13.2693
Magnano in Riviera|1|46.2313|13.1768
Majano|2|46.1852|13.0682
Malborghetto Valbruna|2|46.4978|13.4331
Manzano|2|45.9905|13.3815
Marano Lagunare|3|45.765|13.1675
Martignacco|2|46.0979|13.1368
Mereto di Tomba|2|46.0498|13.0428
Moggio Udinese|2|46.4097|13.1951
Moimacco|2|46.0913|13.377
Montenars|1|46.255|13.1788
Mortegliano|3|45.9458|13.1728
Moruzzo|2|46.1202|13.1232
Muzzana del Turgnano|3|45.8181|13.1293
Nimis|1|46.2007|13.2663
Osoppo|1|46.256|13.0809
Ovaro|2|46.4829|12.8654
Pagnacco|2|46.1243|13.187
Palazzolo dello Stella|3|45.8048|13.0796
Palmanova|3|45.9055|13.3099
Paluzza|2|46.5308|13.0182
Pasian di Prato|2|46.0485|13.1876
Paularo|2|46.5303|13.1166
Pavia di Udine|3|45.9963|13.3041
Pocenia|3|45.8355|13.1008
Pontebba|2|46.5065|13.3064
Porpetto|3|45.8582|13.2179
Povoletto|2|46.1182|13.2988
Pozzuolo del Friuli|3|45.986|13.195
Pradamano|2|46.0338|13.3026
Prato Carnico|3|46.5207|12.8094
Precenicco|3|45.7889|13.0774
Premariacco|2|46.0607|13.3948
Preone|2|46.3937|12.8662
Prepotto|2|46.0457|13.4794
Pulfero|1|46.1793|13.478
Ragogna|2|46.1735|12.9824
Ravascletto|2|46.5229|12.9221
Raveo|2|46.4344|12.8711
Reana del Rojale|2|46.1457|13.2351
Remanzacco|2|46.0856|13.3243
Resia|1|46.3474|13.3361
Resiutta|2|46.3931|13.2186
Rigolato|3|46.5528|12.8521
Rive d'Arcano|2|46.1261|13.0316
Rivignano Teor|3|45.8613|13.0476
Ronchis|3|45.8066|12.9978
Ruda|3|45.8382|13.4019
San Daniele del Friuli|2|46.1532|13.009
San Giorgio di Nogaro|3|45.832|13.2111
San Giovanni al Natisone|2|45.9779|13.4011
San Leonardo|2|46.1275|13.5384
San Pietro al Natisone|2|46.1267|13.4852
San Vito al Torre|3|45.8958|13.3706
San Vito di Fagagna|2|46.0906|13.067
Santa Maria la Longa|3|45.9331|13.288
Sappada|2|46.5678|12.6864
Sauris|2|46.4654|12.7087
Savogna|1|46.1802|13.5522
Sedegliano|2|46.0144|12.9774
Socchieve|2|46.3971|12.8481
Stregna|2|46.1315|13.6036
Sutrio|2|46.512|12.9908
Taipana|1|46.2587|13.3459
Talmassons|3|45.9296|13.1171
Tarcento|1|46.2153|13.2217
Tarvisio|3|46.5053|13.5784
Tavagnacco|2|46.1274|13.2141
Terzo d'Aquileia|3|45.8009|13.3458
Tolmezzo|2|46.4295|13.0562
Torreano|2|46.1285|13.4311
Torviscosa|3|45.8222|13.2769
Trasaghis|1|46.2822|13.0754
Treppo Grande|2|46.1906|13.1581
Treppo Ligosullo|2|46.5443|13.0589
Tricesimo|2|46.1606|13.2125
Trivignano Udinese|3|45.9434|13.3406
Udine|2|46.0635|13.2358
Varmo|3|45.887|12.9877
Venzone|1|46.3337|13.1394
Verzegnis|2|46.3851|12.9872
Villa Santina|2|46.4141|12.9207
Visco|3|45.8922|13.3469
Zuglio|2|46.4618|13.026
#Lazio
@FR|Frosinone
Acquafondata|1|41.5428|13.9528
Acuto|2B|41.7915|13.1744
Alatri|2B|41.7265|13.3423
Alvito|1|41.6885|13.7433
Amaseno|3A|41.4678|13.336
Anagni|2B|41.7447|13.1527
Aquino|2A|41.4911|13.7047
Arce|2A|41.5877|13.5754
Arnara|2B|41.5845|13.3884
Arpino|1|41.648|13.6101
Atina|1|41.6202|13.8
Ausonia|2B|41.3545|13.7487
Belmonte Castello|1|41.5774|13.8158
Boville Ernica|2B|41.6425|13.4727
Broccostella|1|41.6997|13.6353
Campoli Appennino|1|41.7379|13.6785
Casalattico|1|41.6224|13.7256
Casalvieri|1|41.6314|13.713
Cassino|2A|41.4926|13.8305
Castelliri|2A|41.6792|13.5514
Castelnuovo Parano|2B|41.3789|13.7554
Castro dei Volsci|2B|41.5082|13.4063
Castrocielo|2A|41.5293|13.6939
Ceccano|2B|41.5677|13.3333
Ceprano|2B|41.5404|13.5122
Cervaro|1|41.4812|13.9051
Colfelice|2A-2B|41.5549|13.6034
Colle San Magno|1|41.5512|13.6949
Collepardo|2B|41.7643|13.3695
Coreno Ausonio|2B|41.3463|13.7797
Esperia|2B|41.3839|13.6806
Falvaterra|2B|41.5051|13.5238
Ferentino|2B|41.6929|13.2534
Filettino|2B|41.8914|13.3275
Fiuggi|2B|41.7986|13.2205
Fontana Liri|2A|41.61|13.5503
Fontechiari|1|41.668|13.6756
Frosinone|2B|41.6283|13.5763
Fumone|2B|41.7273|13.2899
Gallinaro|1|41.6534|13.7978
Giuliano di Roma|2B|41.5393|13.2796
Guarcino|2B|41.799|13.3134
Isola del Liri|1|41.6792|13.5731
Monte San Giovanni Campano|2A|41.6406|13.5137
Morolo|2B|41.6382|13.1971
Paliano|2B|41.806|13.0581
Pastena|2B|41.4682|13.4917
Patrica|2B|41.5922|13.244
Pescosolido|1|41.7481|13.6566
Picinisco|1|41.6463|13.8678
Pico|2B|41.4508|13.5596
Piedimonte San Germano|2A|41.4983|13.7523
Piglio|2B|41.8308|13.1464
Pignataro Interamna|2A|41.4392|13.7862
Pofi|2B|41.5653|13.4155
Pontecorvo|2B|41.4616|13.6667
Posta Fibreno|1|41.6903|13.6974
Ripi|2B|41.6123|13.4247
Rocca d'Arce|1|41.5871|13.5851
Roccasecca|2A|41.5523|13.6673
San Biagio Saracinisco|1|41.6133|13.9279
San Donato Val di Comino|1|41.7081|13.8126
San Giorgio a Liri|2B|41.4041|13.7613
San Giovanni Incarico|2B|41.5017|13.5579
San Vittore del Lazio|1|41.4611|13.9314
Sant'Ambrogio sul Garigliano|2B|41.389|13.8715
Sant'Andrea del Garigliano|2B|41.3672|13.8409
Sant'Apollinare|2B|41.4027|13.8316
Sant'Elia Fiumerapido|1|41.5391|13.8661
Santopadre|1|41.6031|13.635
Serrone|2B|41.8421|13.0952
Settefrati|1|41.6696|13.85
Sgurgola|2B|41.6709|13.1489
Sora|1|41.7203|13.614
Strangolagalli|2B|41.6007|13.4939
Supino|2B|41.6102|13.2247
Terelle|1|41.5521|13.7784
Torre Cajetani|2B|41.7877|13.2673
Torrice|2B|41.6297|13.3984
Trevi nel Lazio|2B|41.863|13.2463
Trivigliano|2B|41.7757|13.2723
Vallecorsa|3A|41.4446|13.4052
Vallemaio|2B|41.3662|13.8117
Vallerotonda|1|41.5497|13.9146
Veroli|2B|41.6913|13.4176
Vicalvi|1|41.6767|13.7064
Vico nel Lazio|2B|41.7771|13.3419
Villa Latina|1|41.6194|13.8362
Villa Santa Lucia|2A|41.5124|13.77
Villa Santo Stefano|2B|41.5174|13.3102
Viticuso|1|41.5243|13.9711
@LT|Latina
Aprilia|2B|41.5942|12.6486
Bassiano|3A|41.5498|13.0322
Campodimele|3A|41.3904|13.5303
Castelforte|3A|41.299|13.824
Cisterna di Latina|3A|41.5906|12.829
Cori|2B|41.6431|12.9159
Fondi|3B|41.3573|13.43
Formia|3A|41.2593|13.608
Gaeta|3A|41.2183|13.5628
Itri|3A|41.2974|13.5514
Latina|3A|41.4595|13.0126
Lenola|3A|41.4061|13.4594
Maenza|3A|41.5234|13.1805
Minturno|3A|41.263|13.7465
Monte San Biagio|3B|41.3525|13.3522
Norma|3A|41.588|12.9694
Pontinia|3B|41.4085|13.0443
Ponza|3B|40.8932|12.9631
Priverno|3A|41.4726|13.1798
Prossedi|3A|41.5162|13.2607
Rocca Massima|2B|41.6794|12.9194
Roccagorga|3A|41.5253|13.1559
Roccasecca dei Volsci|3A|41.4799|13.2124
Sabaudia|3B|41.3016|13.0259
San Felice Circeo|3B|41.2326|13.0894
Santi Cosma e Damiano|3A|41.8921|12.4875
Sermoneta|3A|41.5493|12.9849
Sezze|3B|41.4984|13.0592
Sonnino|3B|41.4143|13.2415
Sperlonga|3B|41.2602|13.4331
Spigno Saturnia|3A|41.3115|13.7357
Terracina|3B|41.2871|13.2492
Ventotene|3B|40.796|13.4312
@RI|Rieti
Accumoli|1|42.6941|13.2477
Amatrice|1|42.6292|13.2892
Antrodoco|1|42.4161|13.0787
Ascrea|2B|42.1962|12.9966
Belmonte in Sabina|2B|42.3177|12.8928
Borbona|1|42.5125|13.136
Borgo Velino|1|42.406|13.0593
Borgorose|1|42.1934|13.2338
Cantalice|2A|42.4674|12.9038
Cantalupo in Sabina|2B|42.3047|12.6501
Casaprota|2B|42.251|12.8043
Casperia|2B|42.3397|12.6708
Castel di Tora|2B|42.2153|12.9642
Castel Sant'Angelo|1|42.3939|13.0235
Castelnuovo di Farfa|2B|42.2315|12.743
Cittaducale|2A|42.3868|12.9483
Cittareale|1|42.6183|13.1597
Collalto Sabino|2B|42.136|13.048
Colle di Tora|2B|42.2116|12.948
Collegiove|2B|42.1755|13.039
Collevecchio|2B|42.335|12.553
Colli sul Velino|2B|42.4982|12.7787
Concerviano|2B|42.323|12.9855
Configni|2B|42.4235|12.6422
Contigliano|2B|42.4094|12.7665
Cottanello|2B|42.406|12.686
Fara in Sabina|2B|42.2096|12.7294
Fiamignano|1|42.265|13.1264
Forano|2B|42.2966|12.5954
Frasso Sabino|2B|42.2298|12.8056
Greccio|2B|42.4448|12.7518
Labro|2B|42.526|12.8001
Leonessa|1|42.5632|12.9639
Longone Sabino|2B|42.2731|12.9674
Magliano Sabina|2B|42.3614|12.4812
Marcetelli|2B|42.2266|13.0469
Micigliano|1|42.4513|13.0547
Mompeo|2B|42.2483|12.7522
Montasola|2B|42.3864|12.6819
Monte San Giovanni in Sabina|2B|42.3285|12.7774
Montebuono|2B|42.3667|12.5971
Monteleone Sabino|2B|42.2343|12.8562
Montenero Sabino|2B|42.2812|12.8136
Montopoli di Sabina|2B|42.2459|12.6921
Morro Reatino|2A|42.5267|12.8323
Nespolo|2B|42.1562|13.0701
Orvinio|2B|42.1321|12.9397
Paganico Sabino|2B|42.1896|12.9969
Pescorocchiano|1-2A|42.2089|13.1816
Petrella Salto|2A|42.2954|13.0683
Poggio Bustone|2A|42.5018|12.8882
Poggio Catino|2B|42.295|12.6919
Poggio Mirteto|2B|42.2644|12.6848
Poggio Moiano|2B|42.2026|12.8794
Poggio Nativo|2B|42.2154|12.7966
Poggio San Lorenzo|2B|42.2524|12.8442
Posta|1|42.5236|13.096
Pozzaglia Sabina|2B|42.1588|12.9648
Rieti|2A-2B|42.4147|12.8859
Rivodutri|2A|42.5164|12.855
Rocca Sinibalda|2B|42.2744|12.9256
Roccantica|2B|42.3207|12.694
Salisano|2B|42.2573|12.7455
Scandriglia|2B|42.1655|12.8419
Selci|2B|42.3207|12.6212
Stimigliano|2B|42.2993|12.5657
Tarano|2B|42.3559|12.595
Toffia|2B|42.2124|12.7515
Torri in Sabina|2B|42.353|12.6386
Torricella in Sabina|2B|42.2633|12.8701
Turania|2B|42.138|13.0093
Vacone|2B|42.3848|12.6445
Varco Sabino|2B|42.2398|13.0199
@RM|Roma
Affile|2B|41.8841|13.0954
Agosta|2B|41.9816|13.0327
Albano Laziale|2B|41.7289|12.6583
Allumiere|3B|42.1562|11.9038
Anguillara Sabazia|3B|42.0837|12.283
Anticoli Corrado|2B|42.0095|12.9891
Anzio|3A|41.4471|12.6286
Arcinazzo Romano|2B|41.8797|13.1144
Ardea|2B|41.6087|12.5194
Ariccia|2B|41.7207|12.6713
Arsoli|2B|42.0405|13.0184
Artena|2B|41.7419|12.9122
Bellegra|2B|41.8834|13.0268
Bracciano|3B|42.1011|12.1739
Camerata Nuova|2B|42.0191|13.1079
Campagnano di Roma|3A|42.1411|12.3837
Canale Monterano|3B|42.136|12.1031
Canterano|2B|41.9421|13.0373
Capena|2B|42.1401|12.5402
Capranica Prenestina|2B|41.863|12.9518
Carpineto Romano|3A|41.6044|13.0848
Casape|2B|41.9065|12.8853
Castel Gandolfo|2B|41.7425|12.6489
Castel Madama|2B|41.9769|12.8692
Castel San Pietro Romano|2B|41.8457|12.8949
Castelnuovo di Porto|3A|42.1254|12.5007
Cave|2B|41.8179|12.9284
Cerreto Laziale|2B|41.9444|12.9828
Cervara di Roma|2B|41.9882|13.068
Cerveteri|3B|41.9984|12.0989
Ciampino|2B|41.8003|12.6005
Ciciliano|2B|41.9616|12.9409
Cineto Romano|2B|42.0498|12.9631
Civitavecchia|3B|42.0938|11.7922
Civitella San Paolo|2B|42.1985|12.5765
Colleferro|2B|41.727|13.0042
Colonna|2B|41.8337|12.7532
Fiano Romano|2B|42.1719|12.5927
Filacciano|2B|42.2548|12.5977
Fiumicino|3B|41.7676|12.2339
Fonte Nuova|2B|41.9963|12.6236
Formello|3A|42.0825|12.4003
Frascati|2B|41.8082|12.6804
Gallicano nel Lazio|2B|41.8721|12.8185
Gavignano|2B|41.6991|13.0518
Genazzano|2B|41.8297|12.9722
Genzano di Roma|2B|41.707|12.6911
Gerano|2B|41.9331|12.9938
Gorga|2B|41.655|13.1091
Grottaferrata|2B|41.7886|12.6667
Guidonia Montecelio|2B|41.9843|12.6953
Jenne|2B|41.8888|13.1696
Labico|2B|41.7895|12.8809
Ladispoli|3B|41.9537|12.0735
Lanuvio|2B|41.6745|12.6972
Lariano|2B|41.7251|12.8313
Licenza|2B|42.0731|12.9015
Magliano Romano|3A|42.1599|12.4369
Mandela|2B|42.0308|12.9233
Manziana|3B|42.1303|12.1303
Marano Equo|2B|41.994|13.016
Marcellina|2B|42.0237|12.807
Marino|2B|41.7698|12.6586
Mazzano Romano|3A|42.2047|12.3996
Mentana|2B|42.035|12.6423
Monte Compatri|2B|41.8089|12.7378
Monte Porzio Catone|2B|41.8164|12.7153
Monteflavio|2B|42.1082|12.8304
Montelanico|2B|41.6511|13.0399
Montelibretti|2B|42.1409|12.7353
Monterotondo|2B|42.0518|12.6184
Montorio Romano|2B|42.1384|12.8075
Moricone|2B|42.1171|12.7716
Morlupo|3A|42.1489|12.503
Nazzano|2B|42.2293|12.5976
Nemi|2B|41.72|12.7134
Nerola|2B|42.1605|12.7867
Nettuno|3A|41.4575|12.6614
Olevano Romano|2B|41.8606|13.0331
Palestrina|2B|41.839|12.8912
Palombara Sabina|2B|42.0666|12.7658
Percile|2B|42.0946|12.9085
Pisoniano|2B|41.9061|12.9589
Poli|2B|41.8873|12.8931
Pomezia|2B|41.6675|12.5048
Ponzano Romano|2B|42.2578|12.5716
Riano|3A|42.1001|12.5057
Rignano Flaminio|3A|42.21|12.4811
Riofreddo|2B|42.0605|13.0003
Rocca Canterano|2B|41.9565|13.0218
Rocca di Cave|2B|41.8464|12.9455
Rocca di Papa|2B|41.7608|12.7096
Rocca Priora|2B|41.7911|12.762
Rocca Santo Stefano|2B|41.9105|13.0238
Roccagiovine|2B|42.0498|12.9003
Roiate|2B|41.8723|13.0673
Roma|2A-3A-3B|41.8933|12.4829
Roviano|2B|42.0259|12.9944
Sacrofano|3A|42.1049|12.4455
Sambuci|2B|41.9861|12.938
San Cesareo|2B|41.8192|12.8003
San Gregorio da Sassola|2B|41.9171|12.8708
San Polo dei Cavalieri|2B|42.0095|12.8384
San Vito Romano|2B|41.8798|12.9794
Sant'Angelo Romano|2B|42.0351|12.7127
Sant'Oreste|2B|42.2348|12.5189
Santa Marinella|3B|42.0353|11.8683
Saracinesco|2B|42.0039|12.9529
Segni|2B|41.692|13.0233
Subiaco|2B|41.9267|13.0944
Tivoli|2B|41.9609|12.7989
Tolfa|3B|42.1496|11.9382
Torrita Tiberina|2B|42.2359|12.619
Trevignano Romano|3B|42.1559|12.2462
Vallepietra|2B|41.927|13.2307
Vallinfreda|2B|42.0843|12.9966
Valmontone|2B|41.7788|12.9175
Velletri|2B|41.6867|12.777
Vicovaro|2B|42.0179|12.8972
Vivaro Romano|2B|42.0998|13.0067
Zagarolo|2B|41.8384|12.831
@VT|Viterbo
Acquapendente|2B|42.744|11.865
Arlena di Castro|2B|42.4628|11.8207
Bagnoregio|2B|42.627|12.0909
Barbarano Romano|3A|42.2498|12.0674
Bassano in Teverina|2B|42.4661|12.313
Bassano Romano|3B|42.2184|12.193
Blera|2B|42.2725|12.0317
Bolsena|2B|42.6441|11.985
Bomarzo|2B|42.4819|12.2488
Calcata|3A|42.2197|12.4259
Canepina|3A|42.381|12.2337
Canino|2B|42.464|11.7495
Capodimonte|2B|42.5465|11.9048
Capranica|3A|42.2565|12.1776
Caprarola|3A|42.3266|12.2358
Carbognano|3A|42.3316|12.2644
Castel Sant'Elia|3A|42.2518|12.3718
Castiglione in Teverina|2B|42.645|12.2039
Celleno|2B|42.5598|12.1258
Cellere|2B|42.5104|11.7717
Civita Castellana|2B|42.2952|12.4092
Civitella d'Agliano|2B|42.6054|12.1877
Corchiano|3A|42.3449|12.3557
Fabrica di Roma|3A|42.3351|12.2998
Faleria|3A|42.2262|12.4432
Farnese|2B|42.5494|11.7257
Gallese|2B|42.3733|12.4028
Gradoli|2B|42.6437|11.8549
Graffignano|2B|42.5748|12.2044
Grotte di Castro|2B|42.6745|11.8723
Ischia di Castro|2B|42.5447|11.754
Latera|2B|42.629|11.8275
Lubriano|2B|42.6362|12.1088
Marta|2B|42.5339|11.9249
Montalto di Castro|3B|42.3535|11.6063
Monte Romano|2B|42.2665|11.8938
Montefiascone|2B|42.5379|12.031
Monterosi|3B|42.1958|12.3085
Nepi|3A-3B|42.2428|12.3456
Onano|2B|42.6929|11.8164
Oriolo Romano|3B|42.1593|12.1383
Orte|2B|42.4606|12.3856
Piansano|2B|42.5179|11.8283
Proceno|2B|42.7572|11.8303
Ronciglione|3A|42.2902|12.2138
San Lorenzo Nuovo|2B|42.6867|11.9067
Soriano nel Cimino|2B|42.4188|12.2343
Sutri|3B|42.247|12.2151
Tarquinia|3B|42.2532|11.7592
Tessennano|2B|42.4782|11.7905
Tuscania|2B|42.4202|11.8703
Valentano|2B|42.5691|11.8183
Vallerano|3A|42.384|12.2628
Vasanello|2B|42.4137|12.3466
Vejano|2B-3A|42.2168|12.0952
Vetralla|2B|42.3205|12.0575
Vignanello|3A|42.3838|12.2768
Villa San Giovanni in Tuscia|2B|42.2827|12.0525
Viterbo|2B|42.4937|11.9451
Vitorchiano|2B|42.4654|12.1725
#Liguria
@GE|Genova
Arenzano|4|44.4025|8.6831
Avegno|3|44.3913|9.1563
Bargagli|3|44.4478|9.0877
Bogliasco|3|44.3791|9.068
Borzonasca|3|44.4222|9.3866
Busalla|3|44.5735|8.9433
Camogli|3|44.3492|9.1589
Campo Ligure|3|44.5376|8.6982
Campomorone|3|44.5073|8.8901
Carasco|3|44.3498|9.3456
Casarza Ligure|3|44.2735|9.4498
Casella|3|44.5356|8.9968
Castiglione Chiavarese|3|44.2741|9.5147
Ceranesi|3|44.5113|8.8789
Chiavari|3|44.3164|9.3233
Cicagna|3|44.4093|9.2355
Cogoleto|4|44.3893|8.6429
Cogorno|3|44.3331|9.3725
Coreglia Ligure|3|44.3829|9.2643
Crocefieschi|3|44.5797|9.024
Davagna|3|44.467|9.091
Fascia|3|44.572|9.2356
Favale di Malvaro|3|44.453|9.2596
Fontanigorda|3|44.5461|9.3045
Genova|3|44.4073|8.9339
Gorreto|3|44.6048|9.2913
Isola del Cantone|3|44.6456|8.9576
Lavagna|3|44.3122|9.3417
Leivi|3|44.3545|9.3152
Lorsica|3|44.4453|9.2843
Lumarzo|3|44.4529|9.1326
Masone|3|44.5013|8.7163
Mele|3|44.4475|8.7478
Mezzanego|3|44.392|9.4077
Mignanego|3|44.5483|8.9157
Moconesi|3|44.4376|9.2147
Moneglia|3|44.2385|9.49
Montebruno|3|44.5257|9.2476
Montoggio|3|44.5154|9.0443
Ne|3|44.3519|9.4403
Neirone|3|44.4547|9.1905
Orero|3|44.4172|9.289
Pieve Ligure|3|44.3762|9.0862
Portofino|3|44.3037|9.2093
Propata|3|44.5656|9.1859
Rapallo|3|44.3511|9.2297
Recco|3|44.3652|9.1463
Rezzoaglio|3|44.526|9.3873
Ronco Scrivia|3|44.6133|8.9524
Rondanina|3|44.5632|9.2181
Rossiglione|3|44.564|8.6685
Rovegno|3|44.5767|9.2792
San Colombano Certenoli|3|44.3993|9.3288
Sant'Olcese|3|44.4909|8.9705
Santa Margherita Ligure|3|44.334|9.2111
Santo Stefano d'Aveto|3|44.5473|9.4502
Savignone|3|44.5641|8.9896
Serra Riccò|3|44.5187|8.9516
Sestri Levante|3|44.2715|9.3959
Sori|3|44.3734|9.1044
Tiglieto|4|44.5246|8.6193
Torriglia|3|44.5194|9.1584
Tribogna|3|44.4161|9.1956
Uscio|3|44.4133|9.1626
Valbrevenna|3|44.5606|9.0916
Vobbia|3|44.6012|9.0387
Zoagli|3|44.3368|9.267
@IM|Imperia
Airole|3|43.871|7.5542
Apricale|3|43.8804|7.6602
Aquila d'Arroscia|3|44.0859|8.0052
Armo|3|44.088|7.9148
Aurigo|3|43.9827|7.9224
Badalucco|2|43.9156|7.8473
Bajardo|3|43.9032|7.7169
Bordighera|3|43.7851|7.6591
Borghetto d'Arroscia|3|44.0577|7.9817
Borgomaro|3|43.9749|7.9451
Camporosso|3|43.8151|7.6284
Caravonica|3|43.993|7.958
Castel Vittorio|3|43.9286|7.6744
Castellaro|2|43.8652|7.8687
Ceriana|2|43.8807|7.7746
Cervo|2|43.9259|8.1139
Cesio|3|44.0073|7.9735
Chiusanico|2|43.9726|7.9909
Chiusavecchia|2|43.9684|7.9835
Cipressa|2|43.851|7.931
Civezza|2|43.8798|7.9516
Cosio d'Arroscia|3|44.0771|7.833
Costarainera|2|43.8554|7.9387
Diano Arentino|2|43.9496|8.0416
Diano Castello|2|43.9237|8.0672
Diano Marina|2|43.908|8.0667
Diano San Pietro|2|43.9314|8.0717
Dolceacqua|3|43.8517|7.6226
Dolcedo|2|43.9074|7.9511
Imperia|2|43.9584|7.8667
Isolabona|3|43.879|7.6398
Lucinasco|2|43.968|7.964
Mendatica|3|44.0764|7.8056
Molini di Triora|3|43.9906|7.7745
Montalto Carpasio|2|43.9477|7.8619
Montegrosso Pian Latte|3|44.0669|7.8172
Olivetta San Michele|3|43.8694|7.524
Ospedaletti|3|43.8021|7.7182
Perinaldo|3|43.8674|7.6665
Pietrabruna|2|43.8897|7.9029
Pieve di Teco|3|44.047|7.9149
Pigna|3|43.9323|7.6626
Pompeiana|2|43.8537|7.8898
Pontedassio|2|43.9403|8.0138
Pornassio|3|44.0699|7.8713
Prelà|2|43.9262|7.9369
Ranzo|3|44.0596|8.0149
Rezzo|3|44.0214|7.8714
Riva Ligure|2|43.8379|7.8796
Rocchetta Nervina|3|43.8906|7.5996
San Bartolomeo al Mare|2|43.9229|8.1012
San Biagio della Cima|3|43.8182|7.6488
San Lorenzo al Mare|2|43.8547|7.9637
Sanremo|2|43.8198|7.7749
Santo Stefano al Mare|2|43.8383|7.8932
Seborga|3|43.8264|7.6945
Soldano|3|43.8291|7.6548
Taggia|2|43.8696|7.8365
Terzorio|2|43.8523|7.8983
Triora|3|43.9925|7.7662
Vallebona|3|43.8127|7.6665
Vallecrosia|3|43.7888|7.6434
Vasia|2|43.932|7.9529
Ventimiglia|3|43.7918|7.6033
Vessalico|3|44.0459|7.9609
Villa Faraldi|2|43.9685|8.0852
@SP|La Spezia
Ameglia|3|44.0659|9.9574
Arcola|3|44.1144|9.906
Beverino|3|44.206|9.7857
Bolano|2|44.1876|9.8956
Bonassola|3|44.1835|9.5825
Borghetto di Vara|3|44.2238|9.7215
Brugnato|3|44.2371|9.724
Calice al Cornoviglio|2|44.2432|9.8367
Carro|3|44.2728|9.6075
Carrodano|3|44.242|9.6559
Castelnuovo Magra|3|44.0999|10.0169
Deiva Marina|3|44.2182|9.52
Follo|3|44.1728|9.8329
Framura|3|44.2087|9.5545
La Spezia|3|44.2384|9.6912
Lerici|3|44.0736|9.9099
Levanto|3|44.1699|9.612
Luni|3|44.0778|10.0302
Maissana|3|44.3373|9.5363
Monterosso al Mare|3|44.1465|9.6556
Pignone|3|44.1782|9.7235
Portovenere|3|44.0507|9.8345
Riccò del Golfo di Spezia|3|44.1537|9.7639
Riomaggiore|3|44.099|9.7387
Rocchetta di Vara|2|44.2513|9.7573
Santo Stefano di Magra|3|44.1651|9.9173
Sarzana|2|44.1119|9.9587
Sesta Godano|2|44.294|9.6757
Varese Ligure|2|44.3761|9.5927
Vernazza|3|44.1349|9.6828
Vezzano Ligure|3|44.1468|9.8763
Zignago|2|44.2972|9.7491
@SV|Savona
Alassio|2|44.008|8.173
Albenga|3|44.0493|8.2131
Albisola Superiore|4|44.3398|8.5094
Albissola Marina|4|44.3273|8.5031
Altare|3|44.336|8.3399
Andora|2|43.9519|8.1456
Arnasco|3|44.0782|8.1074
Balestrino|3|44.1251|8.1715
Bardineto|3|44.1931|8.1325
Bergeggi|3|44.2497|8.4434
Boissano|3|44.1358|8.2218
Borghetto Santo Spirito|3|44.1144|8.2353
Borgio Verezzi|3|44.165|8.3067
Bormida|3|44.2783|8.2342
Cairo Montenotte|4|44.3993|8.2746
Calice Ligure|3|44.2049|8.2954
Calizzano|3|44.2369|8.1145
Carcare|4|44.3575|8.2902
Casanova Lerrone|3|44.0321|8.0502
Castelbianco|3|44.1118|8.0709
Castelvecchio di Rocca Barbena|3|44.1298|8.1166
Celle Ligure|4|44.3463|8.5443
Cengio|4|44.3903|8.208
Ceriale|3|44.0916|8.2233
Cisano sul Neva|3|44.0864|8.1474
Cosseria|4|44.3683|8.2349
Dego|4|44.443|8.3059
Erli|3|44.1375|8.1031
Finale Ligure|3|44.1689|8.3437
Garlenda|3|44.0342|8.0956
Giustenice|3|44.1726|8.2472
Giusvalla|4|44.4479|8.3941
Laigueglia|2|43.9788|8.1574
Loano|3|44.1288|8.2594
Magliolo|3|44.1915|8.2504
Mallare|3|44.291|8.2966
Massimino|3|44.2996|8.0706
Millesimo|4|44.3675|8.2017
Mioglia|4|44.4905|8.4125
Murialdo|3|44.3166|8.1643
Nasino|3|44.1138|8.0317
Noli|3|44.2059|8.4164
Onzo|3|44.0703|8.05
Orco Feglino|3|44.2216|8.3236
Ortovero|3|44.0534|8.0966
Osiglia|3|44.2826|8.2021
Pallare|3|44.3273|8.2754
Piana Crixia|4|44.4862|8.3061
Pietra Ligure|3|44.1529|8.2866
Plodio|4|44.3512|8.2565
Pontinvrea|4|44.4446|8.4345
Quiliano|3|44.2925|8.4127
Rialto|3|44.2258|8.2631
Roccavignale|4|44.3472|8.1647
Sassello|4|44.479|8.4902
Savona|3|44.2334|8.2526
Spotorno|3|44.2273|8.4192
Stella|4|44.4047|8.5016
Stellanello|2|44.0004|8.058
Testico|3|44.0056|8.0292
Toirano|3|44.1275|8.2049
Tovo San Giacomo|3|44.1759|8.2705
Urbe|4|44.4773|8.6314
Vado Ligure|3|44.2714|8.4382
Varazze|4|44.3593|8.5753
Vendone|3|44.0747|8.0739
Vezzi Portio|3|44.2296|8.3652
Villanova d'Albenga|3|44.0468|8.1428
Zuccarello|3|44.111|8.1158
#Lombardia
@BG|Bergamo
Adrara San Martino|3|45.6999|9.9489
Adrara San Rocco|3|45.714|9.9587
Albano Sant'Alessandro|3|45.6865|9.7707
Albino|3|45.7608|9.7968
Algua|3|45.8262|9.7222
Almè|3|45.737|9.6148
Almenno San Bartolomeo|3|45.7427|9.5823
Almenno San Salvatore|3|45.75|9.5964
Alzano Lombardo|3|45.7336|9.7305
Ambivere|3|45.7196|9.5502
Antegnate|3|45.4865|9.7915
Arcene|3|45.5756|9.6141
Ardesio|3|45.9375|9.9312
Arzago d'Adda|3|45.4815|9.5617
Averara|3|45.9887|9.6314
Aviatico|3|45.8003|9.7717
Azzano San Paolo|3|45.661|9.6752
Azzone|3|45.9785|10.1126
Bagnatica|3|45.6609|9.7811
Barbata|3|45.475|9.7774
Bariano|3|45.5126|9.7049
Barzana|3|45.734|9.5673
Bedulita|3|45.7917|9.5516
Berbenno|3|45.8148|9.571
Bergamo|3|45.7567|9.7542
Berzo San Fermo|3|45.7194|9.9032
Bianzano|3|45.7745|9.9208
Blello|3|45.8378|9.571
Bolgare|3|45.6351|9.8129
Boltiere|3|45.6009|9.5785
Bonate Sopra|3|45.6834|9.5598
Bonate Sotto|3|45.6668|9.5614
Borgo di Terzo|3|45.7218|9.8948
Bossico|3|45.8284|10.0451
Bottanuco|3|45.6399|9.5065
Bracca|3|45.8239|9.7079
Branzi|3|46.0054|9.76
Brembate|3|45.6039|9.5556
Brembate di Sopra|3|45.7168|9.5794
Brignano Gera d'Adda|3|45.5455|9.649
Brumano|3|45.8551|9.5005
Brusaporto|3|45.6708|9.7614
Calcinate|3|45.6197|9.7989
Calcio|3|45.5092|9.851
Calusco d'Adda|3|45.6914|9.4726
Calvenzano|3|45.495|9.6013
Camerata Cornello|3|45.8987|9.6563
Canonica d'Adda|3|45.5757|9.5417
Capizzone|3|45.7845|9.5678
Capriate San Gervasio|3|45.6126|9.5288
Caprino Bergamasco|3|45.7453|9.4817
Caravaggio|3|45.4973|9.6437
Carobbio degli Angeli|3|45.6652|9.8292
Carona|3|46.1411|10.09
Carvico|3|45.7038|9.4822
Casazza|3|45.7492|9.9073
Casirate d'Adda|3|45.4941|9.5678
Casnigo|3|45.816|9.8686
Cassiglio|3|45.9668|9.6121
Castel Rozzone|3|45.5523|9.6199
Castelli Calepio|3|45.632|9.8961
Castione della Presolana|3|45.9075|10.0351
Castro|3|45.803|10.0671
Cavernago|3|45.6251|9.7616
Cazzano Sant'Andrea|3|45.8127|9.8847
Cenate Sopra|3|45.7119|9.8238
Cenate Sotto|3|45.6989|9.8257
Cene|3|45.7837|9.8255
Cerete|3|45.8543|10.011
Chignolo d'Isola|3|45.6676|9.5277
Chiuduno|3|45.6508|9.848
Cisano Bergamasco|3|45.7425|9.4702
Ciserano|3|45.5853|9.6008
Cividate al Piano|3|45.5549|9.831
Clusone|3|45.8871|9.9497
Colere|3|45.9743|10.0828
Cologno al Serio|3|45.5798|9.7077
Colzate|3|45.816|9.8559
Comun Nuovo|3|45.6229|9.6631
Corna Imagna|3|45.8307|9.5448
Cornalba|3|45.8517|9.7432
Cortenuova|3|45.539|9.7879
Costa di Mezzate|3|45.662|9.794
Costa Serina|3|45.8324|9.7419
Costa Valle Imagna|3|45.805|9.5021
Costa Volpino|3|45.8299|10.0982
Covo|3|45.5003|9.7701
Credaro|3|45.6606|9.9311
Curno|3|45.6915|9.611
Cusio|3|45.9909|9.6017
Dalmine|3|45.6493|9.604
Dossena|3|45.8803|9.6968
Endine Gaiano|3|45.7925|9.9691
Entratico|3|45.7056|9.8746
Fara Gera d'Adda|3|45.5557|9.5379
Fara Olivana con Sola|3|45.4917|9.7374
Filago|3|45.6376|9.5564
Fino del Monte|3|45.8927|9.9941
Fiorano al Serio|3|45.7998|9.8423
Fontanella|3|45.4699|9.802
Fonteno|3|45.7578|10.0202
Foppolo|3|46.0419|9.7574
Foresto Sparso|3|45.6909|9.9201
Fornovo San Giovanni|3|45.4979|9.6769
Fuipiano Valle Imagna|3|45.8543|9.5284
Gandellino|3|45.9915|9.9466
Gandino|3|45.8115|9.9031
Gandosso|3|45.6589|9.8889
Gaverina Terme|3|45.7558|9.8867
Gazzaniga|3|45.7966|9.835
Ghisalba|3|45.5942|9.7539
Gorlago|3|45.6767|9.8271
Gorle|3|45.7037|9.719
Gorno|3|45.8629|9.8434
Grassobbio|3|45.6572|9.7231
Gromo|3|45.964|9.9271
Grone|3|45.7275|9.9112
Grumello del Monte|3|45.6372|9.8768
Isola di Fondra|3|45.9785|9.7464
Isso|3|45.4768|9.7584
Lallio|3|45.6664|9.6301
Leffe|3|45.8007|9.8855
Lenna|3|45.944|9.6787
Levate|3|45.6252|9.6242
Locatello|3|45.8345|9.5333
Lovere|3|45.8169|10.0752
Lurano|3|45.5657|9.6402
Luzzana|3|45.7164|9.8805
Madone|3|45.65|9.548
Mapello|3|45.709|9.5475
Martinengo|3|45.5704|9.7674
Medolago|3|45.6686|9.4956
Mezzoldo|3|46.0124|9.6649
Misano di Gera d'Adda|3|45.4688|9.6211
Moio de' Calvi|3|45.952|9.7002
Monasterolo del Castello|3|45.7632|9.9317
Montello|3|45.6721|9.8057
Morengo|3|45.5336|9.7053
Mornico al Serio|3|45.5914|9.8093
Mozzanica|3|45.4761|9.6893
Mozzo|3|45.6987|9.6087
Nembro|3|45.744|9.7593
Olmo al Brembo|3|45.9697|9.6486
Oltre il Colle|3|45.8895|9.7693
Oltressenda Alta|3|45.9167|9.9442
Oneta|3|45.8715|9.8194
Onore|3|45.8912|10.0099
Orio al Serio|3|45.6762|9.693
Ornica|3|45.989|9.5795
Osio Sopra|3|45.6308|9.5911
Osio Sotto|3|45.6161|9.5891
Pagazzano|3|45.5343|9.6712
Paladina|3|45.7307|9.608
Palazzago|3|45.7521|9.535
Palosco|3|45.5875|9.8357
Parre|3|45.8746|9.8909
Parzanica|3|45.738|10.0345
Pedrengo|3|45.696|9.735
Peia|3|45.7998|9.9004
Pianico|3|45.8099|10.0431
Piario|3|45.8965|9.9273
Piazza Brembana|3|45.9478|9.6756
Piazzatorre|3|45.9897|9.6838
Piazzolo|3|45.9798|9.672
Pognano|3|45.5864|9.64
Ponte Nossa|3|45.8661|9.883
Ponte San Pietro|3|45.6978|9.5879
Ponteranica|3|45.7321|9.652
Pontida|3|45.7323|9.4986
Pontirolo Nuovo|3|45.5692|9.5693
Pradalunga|3|45.7467|9.7831
Predore|3|45.6808|10.0144
Premolo|3|45.8702|9.8747
Presezzo|3|45.6921|9.5704
Pumenengo|3|45.4799|9.8701
Ranica|3|45.7263|9.7147
Ranzanico|3|45.7892|9.9357
Riva di Solto|3|45.7736|10.0393
Rogno|3|45.8577|10.1335
Romano di Lombardia|3|45.5184|9.7551
Roncobello|3|45.9557|9.7523
Roncola|3|45.768|9.5613
Rota d'Imagna|3|45.8309|9.5128
Rovetta|3|45.893|9.9835
San Giovanni Bianco|3|45.8741|9.653
San Paolo d'Argon|3|45.6886|9.8041
San Pellegrino Terme|3|45.8386|9.6647
Sant'Omobono Terme|3|45.8117|9.536
Santa Brigida|3|45.9845|9.6218
Sarnico|3|45.6701|9.9635
Scanzorosciate|3|45.7108|9.7351
Schilpario|3|46.0088|10.1578
Sedrina|3|45.7818|9.6241
Selvino|3|45.7811|9.7517
Seriate|3|45.6844|9.718
Serina|3|45.8719|9.7293
Solto Collina|3|45.7818|10.0252
Solza|3|45.6771|9.4889
Songavazzo|3|45.8795|9.9895
Sorisole|3|45.7446|9.6612
Sotto il Monte Giovanni XXIII|3|45.7055|9.5037
Sovere|3|45.8207|10.0231
Spinone al Lago|3|45.7675|9.9242
Spirano|3|45.5821|9.6689
Stezzano|3|45.6514|9.6535
Strozza|3|45.7731|9.5775
Suisio|3|45.6559|9.5002
Taleggio|3|45.8944|9.5627
Tavernola Bergamasca|3|45.7094|10.0463
Telgate|3|45.6289|9.8517
Terno d'Isola|3|45.6855|9.531
Torre Boldone|3|45.7163|9.7082
Torre de' Busi|3|45.7746|9.4804
Torre de' Roveri|3|45.7008|9.7735
Torre Pallavicina|3|45.4464|9.8771
Trescore Balneario|3|45.6965|9.8426
Treviglio|3|45.5217|9.5931
Treviolo|3|45.6715|9.6117
Ubiale Clanezzo|3|45.7809|9.6058
Urgnano|3|45.5972|9.6949
Val Brembilla|3|45.8246|9.6016
Valbondione|3|46.0342|10.0059
Valbrembo|3|45.7178|9.6075
Valgoglio|3|45.9749|9.9136
Valleve|3|46.0282|9.7437
Valnegra|3|45.9494|9.69
Valtorta|3|45.9778|9.5349
Vedeseta|3|45.8909|9.5401
Verdellino|3|45.6031|9.6156
Verdello|3|45.6048|9.629
Vertova|3|45.8102|9.8535
Viadanica|3|45.6843|9.9623
Vigano San Martino|3|45.7265|9.894
Vigolo|3|45.7158|10.0227
Villa d'Adda|3|45.714|9.4616
Villa d'Almè|3|45.7497|9.6145
Villa d'Ogna|3|45.9047|9.9309
Villa di Serio|3|45.7227|9.7324
Villongo|3|45.673|9.9338
Vilminore di Scalve|3|45.9977|10.0925
Zandobbio|3|45.6879|9.8534
Zanica|3|45.6395|9.6841
Zogno|3|45.7937|9.6662
@BS|Brescia
Acquafredda|3|45.3074|10.4147
Adro|3|45.6224|9.9614
Agnosine|2|45.6507|10.3533
Alfianello|3|45.267|10.1482
Anfo|3|45.7664|10.4938
Angolo Terme|3|45.891|10.1461
Artogne|3|45.849|10.1646
Azzano Mella|3|45.4547|10.1168
Bagnolo Mella|3|45.4291|10.1844
Bagolino|3|45.8236|10.4627
Barbariga|3|45.4051|10.0544
Barghe|2|45.6819|10.4122
Bassano Bresciano|3|45.3272|10.1284
Bedizzole|2|45.5106|10.423
Berlingo|3|45.503|10.0437
Berzo Demo|3|46.0934|10.3363
Berzo Inferiore|3|45.9317|10.2806
Bienno|3|45.9356|10.2948
Bione|3|45.6728|10.3389
Borgo San Giacomo|3|45.347|9.9685
Borgosatollo|2|45.4773|10.2408
Borno|3|45.9473|10.2064
Botticino|2|45.5433|10.3232
Bovegno|3|45.7933|10.2738
Bovezzo|3|45.5931|10.2435
Brandico|3|45.4542|10.0527
Braone|3|45.99|10.3432
Breno|3|45.9563|10.304
Brescia|2|45.7796|10.4259
Brione|3|45.6429|10.1462
Caino|2|45.6127|10.3151
Calcinato|2|45.4572|10.4136
Calvagese della Riviera|2|45.54|10.4458
Calvisano|3|45.3481|10.3459
Capo di Ponte|3|46.031|10.3459
Capovalle|2|45.7544|10.5447
Capriano del Colle|3|45.4549|10.1303
Capriolo|3|45.6373|9.9336
Carpenedolo|3|45.3646|10.4294
Castegnato|3|45.5607|10.1153
Castel Mella|3|45.4996|10.145
Castelcovati|3|45.4984|9.9433
Castenedolo|2|45.4716|10.2983
Casto|3|45.6945|10.3212
Castrezzato|3|45.5125|9.9779
Cazzago San Martino|3|45.5805|10.0262
Cedegolo|3|46.0766|10.3501
Cellatica|3|45.5841|10.1802
Cerveno|3|46.0025|10.3258
Ceto|3|46.0026|10.352
Cevo|3|46.0814|10.3686
Chiari|3|45.5365|9.9288
Cigole|3|45.3086|10.1894
Cimbergo|3|46.0241|10.3657
Cividate Camuno|3|45.9425|10.2775
Coccaglio|3|45.5634|9.9783
Collebeato|3|45.5813|10.2103
Collio|3|45.8093|10.3329
Cologne|3|45.5815|9.9412
Comezzano-Cizzago|3|45.4713|9.9501
Concesio|3|45.6052|10.217
Corte Franca|3|45.6374|10.0065
Corteno Golgi|3|46.1662|10.2435
Corzano|3|45.4438|10.0074
Darfo Boario Terme|3|45.8835|10.1807
Dello|3|45.4181|10.0752
Desenzano del Garda|2|45.4695|10.5389
Edolo|3|46.1794|10.3308
Erbusco|3|45.5985|9.9722
Esine|3|45.9257|10.2509
Fiesse|3|45.2315|10.3242
Flero|3|45.4829|10.175
Gambara|3|45.2552|10.2934
Gardone Riviera|2|45.6188|10.5591
Gardone Val Trompia|3|45.6879|10.1837
Gargnano|2|45.6881|10.6635
Gavardo|2|45.5846|10.4382
Ghedi|2|45.4011|10.2793
Gianico|3|45.8645|10.1837
Gottolengo|3|45.291|10.2698
Gussago|3|45.5927|10.1534
Idro|2|45.7377|10.4783
Incudine|3|46.2203|10.3588
Irma|3|45.7713|10.2842
Iseo|3|45.6596|10.051
Isorella|3|45.3092|10.3222
Lavenone|3|45.7397|10.4391
Leno|3|45.367|10.2185
Limone sul Garda|3|45.8141|10.7916
Lodrino|3|45.7197|10.2777
Lograto|3|45.4842|10.0533
Lonato del Garda|2|45.461|10.4845
Longhena|3|45.4377|10.0597
Losine|3|45.9835|10.3162
Lozio|3|45.9861|10.2604
Lumezzane|3|45.6483|10.2645
Maclodio|3|45.477|10.0427
Magasa|3|45.7814|10.616
Mairano|3|45.4492|10.0796
Malegno|3|45.9506|10.2733
Malonno|3|46.1226|10.3192
Manerba del Garda|2|45.556|10.5626
Manerbio|3|45.3558|10.1352
Marcheno|3|45.7094|10.2153
Marmentino|3|45.7555|10.2873
Marone|3|45.7361|10.0938
Mazzano|2|45.5188|10.3542
Milzano|3|45.2736|10.1993
Moniga del Garda|2|45.5285|10.5376
Monno|3|46.2116|10.3399
Monte Isola|3|45.7165|10.0802
Monticelli Brusati|3|45.6322|10.0986
Montichiari|2|45.4152|10.3907
Montirone|3|45.4464|10.2288
Mura|3|45.714|10.3437
Muscoline|2|45.5625|10.4619
Nave|2|45.5877|10.2892
Niardo|3|45.976|10.3333
Nuvolento|2|45.5458|10.3868
Nuvolera|2|45.5322|10.3692
Odolo|2|45.6469|10.3884
Offlaga|3|45.3861|10.1175
Ome|3|45.6273|10.1214
Ono San Pietro|3|46.0169|10.3284
Orzinuovi|3|45.404|9.9216
Orzivecchi|3|45.4207|9.9617
Ospitaletto|3|45.5552|10.0739
Ossimo|3|45.9462|10.2306
Padenghe sul Garda|2|45.5096|10.5064
Paderno Franciacorta|3|45.5892|10.0764
Paisco Loveno|3|46.0783|10.2907
Paitone|2|45.5531|10.4013
Palazzolo sull'Oglio|3|45.5991|9.885
Paratico|3|45.6599|9.9551
Paspardo|3|46.031|10.371
Passirano|3|45.5995|10.0649
Pavone del Mella|3|45.3013|10.2084
Pertica Alta|3|45.7444|10.3439
Pertica Bassa|3|45.7545|10.3747
Pezzaze|3|45.7741|10.2374
Pian Camuno|3|45.8438|10.1579
Piancogno|3|45.9197|10.2253
Pisogne|3|45.8057|10.1082
Polaveno|3|45.6615|10.124
Polpenazze del Garda|2|45.5512|10.5049
Pompiano|3|45.432|9.9893
Poncarale|3|45.4607|10.1739
Ponte di Legno|3|46.2586|10.5087
Pontevico|3|45.2744|10.0925
Pontoglio|3|45.5694|9.8535
Pozzolengo|2|45.406|10.6314
Pralboino|3|45.268|10.2174
Preseglie|2|45.6683|10.3968
Prevalle|2|45.5515|10.4219
Provaglio d'Iseo|3|45.636|10.0442
Provaglio Val Sabbia|2|45.6849|10.4366
Puegnago del Garda|2|45.5657|10.5115
Quinzano d'Oglio|3|45.3109|10.0086
Remedello|3|45.2795|10.3717
Rezzato|2|45.5142|10.3167
Roccafranca|3|45.4643|9.9141
Rodengo Saiano|3|45.5976|10.1095
Roè Volciano|2|45.6168|10.4959
Roncadelle|3|45.5276|10.1497
Rovato|3|45.567|9.9986
Rudiano|3|45.4886|9.8871
Sabbio Chiese|2|45.6586|10.4206
Sale Marasino|3|45.7155|10.1111
Salò|2|45.6057|10.5201
San Felice del Benaco|2|45.5895|10.5517
San Gervasio Bresciano|3|45.3074|10.1487
San Paolo|3|45.3706|10.0268
San Zeno Naviglio|3|45.4916|10.2171
Sarezzo|3|45.6619|10.1959
Saviore dell'Adamello|3|46.0805|10.3997
Sellero|3|46.056|10.344
Seniga|3|45.2427|10.178
Serle|2|45.5703|10.3661
Sirmione|2|45.4688|10.6078
Soiano del Lago|2|45.5278|10.5127
Sonico|3|46.1655|10.3529
Sulzano|3|45.6904|10.101
Tavernole sul Mella|3|45.747|10.2406
Temù|3|46.2492|10.468
Tignale|2|45.7398|10.7218
Torbole Casaglia|3|45.5053|10.1025
Toscolano-Maderno|2|45.6345|10.6095
Travagliato|3|45.5239|10.0798
Tremosine sul Garda|2|45.7711|10.7608
Trenzano|3|45.4773|10.0107
Treviso Bresciano|2|45.7131|10.4637
Urago d'Oglio|3|45.516|9.8697
Vallio Terme|2|45.6102|10.3902
Valvestino|2|45.7621|10.5946
Verolanuova|3|45.3286|10.0761
Verolavecchia|3|45.327|10.0573
Vestone|2|45.7106|10.4035
Vezza d'Oglio|3|46.2402|10.3997
Villa Carcina|3|45.6322|10.1944
Villachiara|3|45.3554|9.931
Villanuova sul Clisi|2|45.6017|10.4539
Vione|3|46.2484|10.4472
Visano|3|45.3184|10.3724
Vobarno|2|45.6436|10.4995
Zone|3|45.7634|10.1159
@CO|Como
Albavilla|4|45.8031|9.1885
Albese con Cassano|4|45.7973|9.1683
Albiolo|4|45.8056|8.9392
Alserio|4|45.7791|9.1995
Alta Valle Intelvi|4|45.9809|9.0419
Alzate Brianza|4|45.7698|9.182
Anzano del Parco|4|45.7685|9.1954
Appiano Gentile|4|45.7346|8.9791
Argegno|4|45.9433|9.1282
Arosio|4|45.717|9.208
Asso|4|45.8607|9.2697
Barni|4|45.9113|9.2651
Bellagio|4|45.9873|9.2613
Bene Lario|4|46.0234|9.1711
Beregazzo con Figliaro|4|45.771|8.9583
Binago|4|45.7844|8.9222
Bizzarone|4|45.8343|8.9427
Blessagno|4|45.9595|9.0975
Blevio|4|45.8399|9.1025
Bregnano|4|45.6987|9.061
Brenna|4|45.743|9.1871
Brienno|4|45.9114|9.1313
Brunate|4|45.8195|9.096
Bulgarograsso|4|45.7471|9.0064
Cabiate|4|45.6742|9.1737
Cadorago|4|45.7246|9.0382
Caglio|4|45.8717|9.2383
Campione d'Italia|4|45.9681|8.971
Cantù|4|45.7395|9.1291
Canzo|4|45.8506|9.2748
Capiago Intimiano|4|45.7708|9.13
Carate Urio|4|45.8805|9.1105
Carbonate|4|45.6837|8.94
Carimate|4|45.703|9.1106
Carlazzo|4|46.05|9.1545
Carugo|4|45.7092|9.1946
Caslino d'Erba|4|45.8376|9.2309
Casnate con Bernate|4|45.7605|9.0743
Cassina Rizzardi|4|45.7505|9.0312
Castelmarte|4|45.8332|9.2327
Castelnuovo Bozzente|4|45.7646|8.9435
Cavargna|4|46.0901|9.1112
Centro Valle Intelvi|4|45.9505|9.0637
Cerano d'Intelvi|4|45.9433|9.0888
Cermenate|4|45.7001|9.0801
Cernobbio|4|45.8414|9.0759
Cirimido|4|45.6998|9.0125
Claino con Osteno|4|46.0095|9.0901
Colonno|4|45.9576|9.1556
Colverde|4|45.8047|9.0015
Como|4|45.9395|9.1494
Corrido|4|46.0458|9.1398
Cremia|4|46.0873|9.2715
Cucciago|4|45.7399|9.0955
Cusino|4|46.0746|9.1525
Dizzasco|4|45.9438|9.0997
Domaso|4|46.151|9.3281
Dongo|4|46.1229|9.2791
Dosso del Liro|4|46.164|9.2729
Erba|4|45.8096|9.2312
Eupilio|4|45.8183|9.2647
Faggeto Lario|4|45.8581|9.1709
Faloppio|4|45.8089|8.9712
Fenegrò|4|45.7016|8.9997
Figino Serenza|4|45.7098|9.1289
Fino Mornasco|4|45.7429|9.0476
Garzeno|4|46.1343|9.2483
Gera Lario|4|46.1711|9.3719
Grandate|4|45.7752|9.0578
Grandola ed Uniti|4|46.0509|9.1899
Gravedona ed Uniti|4|46.1577|9.1844
Griante|4|45.9953|9.2355
Guanzate|4|45.7239|9.0108
Inverigo|4|45.7405|9.2236
Laglio|4|45.881|9.138
Laino|4|45.9845|9.0754
Lambrugo|4|45.7592|9.2418
Lasnigo|4|45.8822|9.2671
Lezzeno|4|45.9451|9.1941
Limido Comasco|4|45.6892|8.9798
Lipomo|4|45.7945|9.1216
Livo|4|46.1688|9.3045
Locate Varesino|4|45.6889|8.9307
Lomazzo|4|45.6992|9.0344
Longone al Segrino|4|45.8192|9.2504
Luisago|4|45.7629|9.0354
Lurago d'Erba|4|45.7486|9.2132
Lurago Marinone|4|45.7058|8.9813
Lurate Caccivio|4|45.7646|8.9915
Magreglio|4|45.9207|9.2621
Mariano Comense|4|45.6971|9.1783
Maslianico|4|45.8428|9.0472
Menaggio|4|46.0226|9.2414
Merone|4|45.7877|9.2462
Moltrasio|4|45.86|9.0984
Monguzzo|4|45.7829|9.2326
Montano Lucino|4|45.7903|9.0275
Montemezzo|4|46.1782|9.3745
Montorfano|4|45.7855|9.1461
Mozzate|4|45.6752|8.9558
Musso|4|46.1143|9.2764
Nesso|4|45.9114|9.1571
Novedrate|4|45.6989|9.1205
Olgiate Comasco|4|45.7853|8.9678
Oltrona di San Mamette|4|45.757|8.9763
Orsenigo|4|45.7774|9.1817
Peglio|4|46.1604|9.2947
Pianello del Lario|4|46.1028|9.2766
Pigra|4|45.9576|9.1277
Plesio|4|46.0464|9.2303
Pognana Lario|4|45.8819|9.1646
Ponna|4|45.9957|9.1108
Ponte Lambro|4|45.8266|9.2254
Porlezza|4|46.0361|9.1184
Proserpio|4|45.8283|9.2455
Pusiano|4|45.8139|9.2818
Rezzago|4|45.8668|9.2497
Rodero|4|45.824|8.9152
Rovellasca|4|45.6694|9.0502
Rovello Porro|4|45.6542|9.0412
Sala Comacina|4|45.9644|9.1663
San Bartolomeo Val Cavargna|4|46.0835|9.1491
San Fermo della Battaglia|4|45.8087|9.0474
San Nazzaro Val Cavargna|4|46.0894|9.1274
San Siro|4|45.4782|9.124
Schignano|4|45.9262|9.1031
Senna Comasco|4|45.763|9.111
Solbiate con Cagno|4|45.8004|8.9154
Sorico|4|46.172|9.3797
Sormano|4|45.8778|9.2487
Stazzona|4|46.1385|9.2747
Tavernerio|4|45.8024|9.1464
Torno|4|45.8576|9.1163
Tremezzina|4|45.9835|9.1915
Trezzone|4|46.1711|9.3515
Turate|4|45.6548|9.0023
Uggiate con Ronago|4|45.8233|8.9617
Val Rezzo|4|46.0703|9.1009
Valbrona|4|45.8811|9.3016
Valmorea|4|45.8175|8.9322
Valsolda|4|46.0291|9.0439
Veleso|4|45.9084|9.1821
Veniano|4|45.7156|8.9831
Vercana|4|46.1595|9.3351
Vertemate con Minoprio|4|45.7282|9.0784
Villa Guardia|4|45.7738|9.0253
Zelbio|4|45.9046|9.1805
@CR|Cremona
Acquanegra Cremonese|3|45.1684|9.8901
Agnadello|3|45.4444|9.5571
Annicco|3|45.2446|9.8795
Azzanello|3|45.3129|9.9216
Bagnolo Cremasco|3|45.3612|9.613
Bonemerse|3|45.1137|10.0775
Bordolano|3|45.294|9.9867
Calvatone|3|45.1286|10.4413
Camisano|3|45.4433|9.7458
Campagnola Cremasca|3|45.3985|9.6695
Capergnanica|3|45.3376|9.6434
Cappella Cantone|3|45.2469|9.8384
Cappella de' Picenardi|3|45.1586|10.23
Capralba|3|45.4441|9.6433
Casalbuttano ed Uniti|3|45.2456|9.9739
Casale Cremasco-Vidolasco|3|45.437|9.7209
Casaletto Ceredano|3|45.3181|9.6176
Casaletto di Sopra|3|45.4192|9.7826
Casaletto Vaprio|3|45.4082|9.6288
Casalmaggiore|3|44.9864|10.4154
Casalmorano|3|45.2864|9.8997
Castel Gabbiano|3|45.4683|9.7165
Casteldidone|3|45.0695|10.4063
Castelleone|3|45.2938|9.7643
Castelverde|3|45.1888|9.9956
Castelvisconti|3|45.3054|9.9411
Cella Dati|3|45.0953|10.2215
Chieve|3|45.3405|9.6165
Cicognolo|3|45.1646|10.1946
Cingia de' Botti|3|45.0851|10.2755
Corte de' Cortesi con Cignone|3|45.2674|10.0031
Corte de' Frati|3|45.22|10.0967
Credera Rubbiano|3|45.2961|9.6505
Crema|3|45.3628|9.6875
Cremona|3|45.2209|10.037
Cremosano|3|45.3949|9.6396
Crotta d'Adda|3|45.1585|9.8542
Cumignano sul Naviglio|3|45.3555|9.8356
Derovere|3|45.11|10.248
Dovera|3|45.3652|9.5417
Fiesco|3|45.3364|9.7776
Formigara|3|45.2232|9.7718
Gabbioneta-Binanuova|3|45.2184|10.2077
Gadesco-Pieve Delmona|3|45.1677|10.1149
Genivolta|3|45.3326|9.8773
Gerre de' Caprioli|3|45.0902|10.0514
Gombito|3|45.2616|9.728
Grontardo|3|45.2019|10.1508
Grumello Cremonese ed Uniti|3|45.2007|9.8661
Gussola|3|45.0113|10.3501
Isola Dovarese|3|45.1763|10.313
Izano|3|45.3554|9.75
Madignano|3|45.3443|9.7267
Malagnino|3|45.1348|10.1148
Martignana di Po|3|45.0111|10.3798
Monte Cremasco|3|45.3735|9.5728
Montodine|3|45.2852|9.7073
Moscazzano|3|45.2923|9.6835
Motta Baluffi|3|45.0551|10.2592
Offanengo|3|45.3789|9.7424
Olmeneta|3|45.2359|10.0223
Ostiano|3|45.2208|10.2521
Paderno Ponchielli|3|45.2389|9.9303
Palazzo Pignano|3|45.3901|9.5696
Pandino|3|45.4071|9.5535
Persico Dosimo|3|45.1814|10.0766
Pescarolo ed Uniti|3|45.1951|10.1877
Pessina Cremonese|3|45.1855|10.2487
Piadena Drizzona|3|45.1358|10.3581
Pianengo|3|45.4022|9.6948
Pieranica|3|45.4258|9.6104
Pieve d'Olmi|3|45.0896|10.1237
Pieve San Giacomo|3|45.1303|10.1863
Pizzighettone|3|45.1891|9.7899
Pozzaglio ed Uniti|3|45.211|10.0462
Quintano|3|45.4205|9.6186
Ricengo|3|45.4057|9.724
Ripalta Arpina|3|45.3019|9.729
Ripalta Cremasca|3|45.3286|9.6792
Ripalta Guerina|3|45.306|9.7051
Rivarolo del Re ed Uniti|3|45.028|10.4698
Rivolta d'Adda|3|45.4707|9.5126
Robecco d'Oglio|3|45.2594|10.0766
Romanengo|3|45.3772|9.785
Salvirola|3|45.3555|9.7802
San Bassano|3|45.2435|9.8079
San Daniele Po|3|45.0638|10.1823
San Giovanni in Croce|3|45.0789|10.3752
San Martino del Lago|3|45.0732|10.3169
Scandolara Ravara|3|45.0531|10.3017
Scandolara Ripa d'Oglio|3|45.2211|10.1598
Sergnano|3|45.4289|9.7017
Sesto ed Uniti|3|45.1864|9.9351
Solarolo Rainerio|3|45.0816|10.3563
Soncino|3|45.399|9.8744
Soresina|3|45.2865|9.857
Sospiro|3|45.1086|10.1577
Spinadesco|3|45.1488|9.9297
Spineda|3|45.0603|10.5134
Spino d'Adda|3|45.3989|9.4923
Stagno Lombardo|3|45.0732|10.0892
Ticengo|3|45.3693|9.8277
Torlino Vimercati|3|45.418|9.5947
Tornata|3|45.1044|10.4308
Torre de' Picenardi|3|45.1436|10.2869
Torricella del Pizzo|3|45.0196|10.2927
Trescore Cremasco|3|45.4016|9.625
Trigolo|3|45.3294|9.8164
Vaiano Cremasco|3|45.372|9.5872
Vailate|3|45.4633|9.6028
Vescovato|3|45.1751|10.1646
Volongo|3|45.2122|10.3019
Voltido|3|45.112|10.333
@LC|Lecco
Abbadia Lariana|3|45.9|9.3341
Airuno|3|45.7539|9.4242
Annone di Brianza|3|45.8076|9.3324
Ballabio|3|45.8982|9.4234
Barzago|3|45.7555|9.3142
Barzanò|3|45.7335|9.3128
Barzio|3|45.9461|9.4688
Bellano|4|46.043|9.304
Bosisio Parini|3|45.8023|9.2907
Brivio|3|45.742|9.4441
Bulciago|3|45.7547|9.291
Calco|3|45.7249|9.4159
Calolziocorte|3|45.8015|9.433
Carenno|3|45.8035|9.462
Casargo|4|46.0395|9.3882
Casatenovo|3|45.6964|9.3116
Cassago Brianza|3|45.7382|9.2911
Cassina Valsassina|3|45.9321|9.4789
Castello di Brianza|3|45.7565|9.3454
Cernusco Lombardone|3|45.6929|9.4007
Cesana Brianza|3|45.8168|9.2995
Civate|3|45.8281|9.3429
Colico|4|46.1162|9.315
Colle Brianza|3|45.7617|9.3624
Cortenova|4|45.9999|9.3832
Costa Masnaga|3|45.767|9.2783
Crandola Valsassina|4|46.0229|9.3788
Cremella|3|45.7417|9.2999
Cremeno|3|45.9348|9.4737
Dervio|4|46.0766|9.3045
Dolzago|3|45.767|9.3393
Dorio|4|46.1018|9.3193
Ello|3|45.7857|9.3653
Erve|3|45.8216|9.4528
Esino Lario|4|45.9939|9.3332
Galbiate|3|45.8175|9.375
Garbagnate Monastero|3|45.7729|9.3026
Garlate|3|45.806|9.402
Imbersago|3|45.7059|9.4445
Introbio|3|45.9726|9.4531
La Valletta Brianza|3|45.7287|9.3692
Lecco|3|45.9005|9.412
Lierna|4|45.9592|9.3025
Lomagna|3|45.668|9.376
Malgrate|3|45.8526|9.3753
Mandello del Lario|3|45.9192|9.3193
Margno|4|46.031|9.3816
Merate|3|45.6987|9.4116
Missaglia|3|45.7087|9.3358
Moggio|3|45.9323|9.4879
Molteno|3|45.7804|9.3074
Monte Marenzo|3|45.7708|9.4546
Montevecchia|3|45.7057|9.3754
Monticello Brianza|3|45.7088|9.3141
Morterone|3|45.8795|9.4862
Nibionno|3|45.7465|9.2689
Oggiono|3|45.7919|9.3467
Olgiate Molgora|3|45.7303|9.4033
Olginate|3|45.8009|9.4133
Oliveto Lario|4|45.9292|9.2859
Osnago|3|45.6757|9.3911
Paderno d'Adda|3|45.6815|9.4446
Pagnona|4|46.0597|9.4029
Parlasco|4|46.0179|9.3449
Pasturo|3|45.9518|9.4422
Perledo|4|46.0128|9.2963
Pescate|3|45.8335|9.3939
Premana|4|46.0517|9.4235
Primaluna|4|45.987|9.4296
Robbiate|3|45.6911|9.4413
Rogeno|3|45.7824|9.274
Santa Maria Hoè|3|45.7444|9.375
Sirone|3|45.7727|9.3221
Sirtori|3|45.7366|9.3308
Sueglio|4|46.0861|9.3324
Suello|3|45.8168|9.3115
Taceno|4|46.0245|9.3639
Valgreghentino|3|45.7699|9.4122
Valmadrera|3|45.8463|9.3582
Valvarrone|4|46.0849|9.3614
Varenna|4|46.01|9.2832
Vercurago|3|45.8129|9.4244
Verderio|3|45.6657|9.4376
Viganò|3|45.7246|9.3246
@LO|Lodi
Abbadia Cerreto|3|45.3119|9.5942
Bertonico|3|45.2331|9.6681
Boffalora d'Adda|3|45.3598|9.4942
Borghetto Lodigiano|3|45.2133|9.4997
Borgo San Giovanni|3|45.278|9.4358
Brembio|3|45.2146|9.5715
Casaletto Lodigiano|3|45.2936|9.362
Casalmaiocco|3|45.3539|9.3744
Casalpusterlengo|3|45.1793|9.6484
Caselle Landi|3|45.1026|9.7956
Caselle Lurani|3|45.2804|9.3602
Castelgerundo|3|45.2003|9.7438
Castelnuovo Bocca d'Adda|3|45.1128|9.868
Castiglione d'Adda|3|45.2189|9.6941
Castiraga Vidardo|3|45.2648|9.3929
Cavenago d'Adda|3|45.284|9.6014
Cervignano d'Adda|3|45.3739|9.4241
Codogno|3|45.1601|9.7044
Comazzo|3|45.441|9.4647
Cornegliano Laudense|3|45.2862|9.488
Corno Giovine|3|45.1333|9.7585
Cornovecchio|3|45.1367|9.7994
Corte Palasio|3|45.3096|9.5643
Crespiatica|3|45.3567|9.5752
Fombio|3|45.1366|9.6845
Galgagnano|3|45.358|9.4454
Graffignana|3|45.2092|9.4526
Guardamiglio|3|45.1099|9.6798
Livraga|3|45.1923|9.5465
Lodi|3|45.2613|9.4917
Lodi Vecchio|3|45.3011|9.4166
Maccastorna|3|45.1443|9.8552
Mairago|3|45.2518|9.5784
Maleo|3|45.1689|9.7635
Marudo|3|45.253|9.3772
Massalengo|3|45.2647|9.4902
Meleti|3|45.1189|9.837
Merlino|3|45.4334|9.4299
Montanaso Lombardo|3|45.3358|9.4687
Mulazzano|3|45.3735|9.398
Orio Litta|3|45.1603|9.5542
Ospedaletto Lodigiano|3|45.1688|9.5787
Ossago Lodigiano|3|45.2457|9.5371
Pieve Fissiraga|3|45.2633|9.4584
Salerano sul Lambro|3|45.2966|9.3852
San Fiorano|3|45.1364|9.7222
San Martino in Strada|3|45.2715|9.528
San Rocco al Porto|3|45.082|9.6972
Sant'Angelo Lodigiano|3|45.2381|9.4087
Santo Stefano Lodigiano|3|45.1201|9.7356
Secugnago|3|45.2329|9.5935
Senna Lodigiana|3|45.1517|9.5939
Somaglia|3|45.1467|9.6379
Sordio|3|45.3411|9.3657
Tavazzano con Villavesco|3|45.3341|9.4037
Terranova dei Passerini|3|45.1983|9.6771
Turano Lodigiano|3|45.2489|9.6215
Valera Fratta|3|45.2569|9.336
Villanova del Sillaro|3|45.238|9.4819
Zelo Buon Persico|3|45.4111|9.4318
@MN|Mantova
Acquanegra sul Chiese|3|45.1625|10.4347
Asola|3|45.2211|10.4131
Bagnolo San Vito|3|45.0923|10.8804
Borgo Mantovano|3|45.0265|11.122
Borgo Virgilio|3|45.0881|10.7858
Borgocarbonara|3|45.0344|11.2148
Bozzolo|3|45.1025|10.484
Canneto sull'Oglio|3|45.1494|10.3797
Casalmoro|3|45.2596|10.4045
Casaloldo|3|45.2548|10.4744
Casalromano|3|45.2007|10.3694
Castel d'Ario|3|45.189|10.9751
Castel Goffredo|3|45.2953|10.473
Castelbelforte|3|45.2147|10.8928
Castellucchio|3|45.1473|10.6485
Castiglione delle Stiviere|2|45.3897|10.4889
Cavriana|2|45.3476|10.5985
Ceresara|3|45.2651|10.567
Commessaggio|3|45.0344|10.5453
Curtatone|3|45.1096|10.7158
Dosolo|3|44.9534|10.6376
Gazoldo degli Ippoliti|3|45.2003|10.5794
Gazzuolo|3|45.0692|10.5831
Goito|3|45.2545|10.6729
Gonzaga|3|44.9525|10.8226
Guidizzolo|3|45.3207|10.5805
Magnacavallo|3|45.0056|11.1811
Mantova|3|45.1694|10.6706
Marcaria|3|45.1206|10.5328
Mariana Mantovana|3|45.1929|10.4869
Marmirolo|3|45.2206|10.7564
Medole|3|45.3243|10.5144
Moglia|3|44.9372|10.9134
Monzambano|2|45.3861|10.6924
Motteggiana|3|45.0349|10.764
Ostiglia|3|45.0704|11.1364
Pegognaga|3|44.996|10.8588
Piubega|3|45.2273|10.5345
Poggio Rusco|3|44.9756|11.1146
Pomponesco|3|44.9288|10.5919
Ponti sul Mincio|2|45.4125|10.6872
Porto Mantovano|3|45.1925|10.7552
Quingentole|3|45.0391|11.0458
Quistello|3|45.0066|10.9805
Redondesco|3|45.1664|10.5123
Rivarolo Mantovano|3|45.0703|10.4321
Rodigo|3|45.1996|10.625
Roncoferraro|3|45.1359|10.9514
Roverbella|3|45.2658|10.7675
Sabbioneta|3|44.9984|10.4886
San Benedetto Po|3|45.0419|10.9283
San Giacomo delle Segnate|3|44.9726|11.0331
San Giorgio Bigarello|3|45.1805|10.8718
San Giovanni del Dosso|3|44.9669|11.0816
San Martino dall'Argine|3|45.0991|10.5183
Schivenoglia|3|44.9951|11.073
Sermide e Felonica|3|44.9783|11.2904
Serravalle a Po|3|45.0729|11.1005
Solferino|2|45.3686|10.5667
Sustinente|3|45.0693|11.0196
Suzzara|3|44.9919|10.7431
Viadana|3|44.9268|10.5202
Villimpenta|3|45.1447|11.0302
Volta Mantovana|3|45.3213|10.6592
@MI|Milano
Abbiategrasso|4|45.3987|8.9162
Albairate|4|45.4211|8.9381
Arconate|4|45.5407|8.8482
Arese|4|45.549|9.0779
Arluno|4|45.5051|8.9415
Assago|4|45.4054|9.1314
Baranzate|4|45.5272|9.1176
Bareggio|4|45.4777|8.996
Basiano|3|45.5736|9.4679
Basiglio|3|45.3492|9.1646
Bellinzago Lombardo|3|45.5421|9.446
Bernate Ticino|4|45.4793|8.818
Besate|4|45.313|8.9696
Binasco|3|45.332|9.1
Boffalora sopra Ticino|4|45.4673|8.8306
Bollate|4|45.5438|9.1177
Bresso|3|45.5367|9.1877
Bubbiano|4|45.3273|9.0145
Buccinasco|4|45.4171|9.1098
Buscate|4|45.5449|8.8129
Bussero|3|45.5367|9.372
Busto Garolfo|4|45.5456|8.8833
Calvignasco|4|45.326|9.0277
Cambiago|3|45.5725|9.4268
Canegrate|4|45.5705|8.9268
Carpiano|3|45.3406|9.2727
Carugate|3|45.5498|9.3437
Casarile|3|45.3179|9.1049
Casorezzo|4|45.5244|8.9015
Cassano d'Adda|3|45.5263|9.5215
Cassina de' Pecchi|3|45.5192|9.362
Cassinetta di Lugagnano|4|45.4236|8.9083
Castano Primo|4|45.5516|8.777
Cernusco sul Naviglio|3|45.5246|9.3309
Cerro al Lambro|3|45.33|9.3391
Cerro Maggiore|4|45.593|8.9514
Cesano Boscone|4|45.4471|9.0941
Cesate|4|45.5965|9.0773
Cinisello Balsamo|3|45.5561|9.2143
Cisliano|4|45.4447|8.9902
Cologno Monzese|3|45.5286|9.2782
Colturano|3|45.3798|9.3379
Corbetta|4|45.4659|8.9201
Cormano|4|45.5445|9.1676
Cornaredo|4|45.5017|9.0257
Corsico|4|45.4307|9.1102
Cuggiono|4|45.5062|8.8153
Cusago|4|45.4462|9.0335
Cusano Milanino|4|45.5522|9.1837
Dairago|4|45.566|8.8632
Dresano|3|45.373|9.3606
Gaggiano|4|45.4065|9.0344
Garbagnate Milanese|4|45.5771|9.08
Gessate|3|45.5544|9.4352
Gorgonzola|3|45.5316|9.4047
Grezzago|3|45.5919|9.4952
Gudo Visconti|4|45.3729|8.9988
Inveruno|4|45.5138|8.852
Inzago|3|45.5405|9.4821
Lacchiarella|3|45.3218|9.137
Lainate|4|45.5717|9.0285
Legnano|4|45.5947|8.9184
Liscate|3|45.4815|9.409
Locate di Triulzi|3|45.3579|9.2246
Magenta|4|45.4654|8.8838
Magnago|4|45.5787|8.8019
Marcallo con Casone|4|45.4872|8.8733
Masate|3|45.5675|9.4638
Mediglia|3|45.3954|9.3317
Melegnano|3|45.3588|9.324
Melzo|3|45.4986|9.4243
Mesero|4|45.5013|8.8542
Milano|3|45.4668|9.1905
Morimondo|4|45.3524|8.9548
Motta Visconti|3|45.2882|8.9925
Nerviano|4|45.5536|8.9707
Nosate|4|45.5509|8.7265
Novate Milanese|4|45.5319|9.1408
Noviglio|3|45.3602|9.0504
Opera|3|45.3731|9.2111
Ossona|4|45.5062|8.9013
Ozzero|4|45.3658|8.9245
Paderno Dugnano|4|45.5719|9.1681
Pantigliate|3|45.4395|9.3526
Parabiago|4|45.5586|8.9479
Paullo|3|45.4168|9.3982
Pero|4|45.5102|9.0895
Peschiera Borromeo|3|45.4318|9.3118
Pessano con Bornago|3|45.5485|9.3883
Pieve Emanuele|3|45.3559|9.2021
Pioltello|3|45.501|9.3263
Pogliano Milanese|4|45.5373|8.9914
Pozzo d'Adda|3|45.5757|9.5004
Pozzuolo Martesana|3|45.514|9.4563
Pregnana Milanese|4|45.5158|9.008
Rescaldina|4|45.616|8.9489
Rho|4|45.5285|9.0402
Robecchetto con Induno|4|45.5325|8.7646
Robecco sul Naviglio|4|45.4365|8.8873
Rodano|3|45.4777|9.3535
Rosate|4|45.352|9.0175
Rozzano|3|45.3832|9.1541
San Colombano al Lambro|3|45.1817|9.4886
San Donato Milanese|3|45.4181|9.2716
San Giorgio su Legnano|4|45.5738|8.9137
San Giuliano Milanese|3|45.3943|9.2919
San Vittore Olona|4|45.5861|8.9427
San Zenone al Lambro|3|45.3273|9.3553
Santo Stefano Ticino|4|45.4873|8.9186
Sedriano|4|45.4883|8.9687
Segrate|3|45.4907|9.2948
Senago|4|45.5763|9.1245
Sesto San Giovanni|3|45.5357|9.2377
Settala|3|45.4544|9.3868
Settimo Milanese|4|45.4803|9.0554
Solaro|4|45.6175|9.081
Trezzano Rosa|3|45.5828|9.4867
Trezzano sul Naviglio|4|45.418|9.0691
Trezzo sull'Adda|3|45.6087|9.5198
Tribiano|3|45.4134|9.379
Truccazzano|3|45.4839|9.4686
Turbigo|4|45.5292|8.7367
Vanzaghello|4|45.5793|8.7824
Vanzago|4|45.5268|8.995
Vaprio d'Adda|3|45.5766|9.5292
Vermezzo con Zelo|4|45.3908|8.9822
Vernate|3|45.3161|9.061
Vignate|3|45.4966|9.3767
Villa Cortese|4|45.5668|8.8889
Vimodrone|3|45.5128|9.2847
Vittuone|4|45.488|8.9524
Vizzolo Predabissi|3|45.3564|9.3498
Zibido San Giacomo|3|45.36|9.106
@MB|Monza e della Brianza
Agrate Brianza|3|45.5762|9.3509
Aicurzio|3|45.64|9.4149
Albiate|3|45.659|9.2558
Arcore|3|45.6266|9.3215
Barlassina|4|45.6564|9.1301
Bellusco|3|45.6187|9.4186
Bernareggio|3|45.6475|9.4061
Besana in Brianza|3|45.7018|9.2883
Biassono|3|45.631|9.2751
Bovisio-Masciago|4|45.6109|9.1519
Briosco|3|45.7101|9.2406
Brugherio|3|45.5507|9.3012
Burago di Molgora|3|45.5967|9.3777
Busnago|3|45.6162|9.4657
Camparada|3|45.656|9.3196
Caponago|3|45.5654|9.3754
Carate Brianza|3|45.6765|9.2372
Carnate|3|45.6473|9.3791
Cavenago di Brianza|3|45.5849|9.4161
Ceriano Laghetto|4|45.6283|9.0808
Cesano Maderno|4|45.6282|9.1462
Cogliate|4|45.6455|9.0807
Concorezzo|3|45.5897|9.3359
Cornate d'Adda|3|45.6467|9.4659
Correzzana|3|45.6657|9.3036
Desio|3|45.6183|9.2081
Giussano|4|45.6994|9.2097
Lazzate|4|45.6723|9.0852
Lentate sul Seveso|4|45.6784|9.1182
Lesmo|3|45.649|9.3057
Limbiate|4|45.5986|9.1197
Lissone|3|45.6108|9.2408
Macherio|3|45.6401|9.2694
Meda|4|45.6625|9.1568
Mezzago|3|45.629|9.4449
Misinto|4|45.6624|9.0839
Monza|3|45.5834|9.2735
Muggiò|3|45.5932|9.2271
Nova Milanese|4|45.5893|9.2003
Ornago|3|45.5984|9.4222
Renate|3|45.7244|9.2799
Roncello|3|45.6024|9.4576
Ronco Briantino|3|45.6676|9.4007
Seregno|3|45.6497|9.2054
Seveso|4|45.6435|9.1374
Sovico|3|45.6486|9.2648
Sulbiate|3|45.634|9.4207
Triuggio|3|45.6614|9.2674
Usmate Velate|3|45.6525|9.3543
Varedo|4|45.5974|9.1563
Vedano al Lambro|3|45.6115|9.2751
Veduggio con Colzano|3|45.7336|9.2625
Verano Brianza|4|45.6882|9.2305
Villasanta|3|45.604|9.3006
Vimercate|3|45.614|9.3701
@PV|Pavia
Alagna|3|45.1699|8.8898
Albonese|4|45.2944|8.7063
Albuzzano|3|45.1866|9.275
Arena Po|3|45.0966|9.3628
Badia Pavese|3|45.1203|9.4688
Bagnaria|3|44.8273|9.1226
Barbianello|3|45.0767|9.2052
Bascapè|3|45.3083|9.3135
Bastida Pancarana|3|45.0861|9.0852
Battuda|3|45.2747|9.078
Belgioioso|3|45.1586|9.3138
Bereguardo|3|45.2574|9.028
Borgarello|3|45.2407|9.1405
Borgo Priolo|3|44.9664|9.1485
Borgo San Siro|3|45.235|8.9134
Borgoratto Mormorolo|3|44.9307|9.1933
Bornasco|3|45.2666|9.218
Bosnasco|3|45.0644|9.3585
Brallo di Pregola|3|44.7382|9.2814
Breme|4|45.1269|8.6236
Bressana Bottarone|3|45.0836|9.1223
Broni|3|45.0622|9.2612
Calvignano|3|44.9827|9.1682
Campospinoso Albaredo|3|45.0944|9.245
Candia Lomellina|4|45.1788|8.5948
Canneto Pavese|3|45.0505|9.2788
Carbonara al Ticino|3|45.1654|9.062
Casanova Lonati|3|45.0945|9.2135
Casatisma|3|45.0491|9.132
Casei Gerola|3|45.0061|8.927
Casorate Primo|3|45.3124|9.0168
Cassolnovo|4|45.3656|8.8101
Castana|3|45.0268|9.2725
Casteggio|3|45.0141|9.1236
Castelletto di Branduzzo|3|45.0718|9.09
Castello d'Agogna|4|45.2346|8.6871
Castelnovetto|4|45.2548|8.6118
Cava Manara|3|45.1402|9.1069
Cecima|3|44.851|9.0802
Ceranova|3|45.2603|9.2432
Ceretto Lomellina|4|45.245|8.6724
Cergnago|4|45.1982|8.7728
Certosa di Pavia|3|45.257|9.1481
Cervesina|3|45.0613|9.0162
Chignolo Po|3|45.1482|9.4816
Cigognola|3|45.0328|9.2449
Cilavegna|4|45.3098|8.7433
Codevilla|3|44.9633|9.0574
Colli Verdi|3|44.9169|9.2487
Confienza|4|45.3322|8.5563
Copiano|3|45.1963|9.3225
Corana|3|45.0617|8.9683
Cornale e Bastida|3|45.0454|8.9126
Corteolona e Genzone|3|45.1668|9.3648
Corvino San Quirico|3|45.0102|9.1624
Costa de' Nobili|3|45.1321|9.3789
Cozzo|4|45.1927|8.611
Cura Carpignano|3|45.2121|9.2555
Dorno|3|45.1551|8.9519
Ferrera Erbognone|3|45.1151|8.8643
Filighera|3|45.1771|9.316
Fortunago|3|44.9212|9.1839
Frascarolo|3|45.0467|8.682
Galliavola|3|45.0976|8.8188
Gambarana|3|45.029|8.7625
Gambolò|3|45.259|8.8591
Garlasco|3|45.1974|8.9237
Gerenzago|3|45.2066|9.3597
Giussago|3|45.2848|9.1407
Godiasco Salice Terme|3|44.8902|9.0657
Golferenzo|3|44.962|9.307
Gravellona Lomellina|4|45.3277|8.7641
Gropello Cairoli|3|45.1786|8.994
Inverno e Monteleone|3|45.1979|9.3853
Landriano|3|45.312|9.2601
Langosco|4|45.2144|8.5637
Lardirago|3|45.2353|9.2332
Linarolo|3|45.161|9.2709
Lirio|3|44.994|9.2556
Lomello|3|45.1211|8.7962
Lungavilla|3|45.0407|9.0814
Magherno|3|45.2236|9.3294
Marcignago|3|45.2531|9.0793
Marzano|3|45.248|9.2951
Mede|3|45.0979|8.7359
Menconico|3|44.7964|9.2793
Mezzana Bigli|3|45.0599|8.8484
Mezzana Rabattone|3|45.0949|9.0313
Mezzanino|3|45.1247|9.2053
Miradolo Terme|3|45.172|9.4456
Montalto Pavese|3|44.9793|9.2098
Montebello della Battaglia|3|45.001|9.1035
Montecalvo Versiggia|3|44.9713|9.2855
Montescano|3|45.0326|9.2962
Montesegale|3|44.9063|9.1271
Monticelli Pavese|3|45.1107|9.515
Montù Beccaria|3|45.0369|9.3155
Mornico Losana|3|45.0103|9.2051
Mortara|4|45.2479|8.7364
Nicorvo|4|45.2857|8.6679
Olevano di Lomellina|4|45.213|8.7173
Oliva Gessi|3|45.0036|9.1794
Ottobiano|3|45.1528|8.8292
Palestro|4|45.3018|8.5334
Pancarana|3|45.0749|9.0508
Parona|4|45.2826|8.7508
Pavia|3|45.0369|9.1378
Pietra de' Giorgi|3|45.0207|9.2306
Pieve Albignola|3|45.1131|8.9588
Pieve del Cairo|3|45.05|8.8041
Pieve Porto Morone|3|45.1094|9.4358
Pinarolo Po|3|45.0699|9.1673
Pizzale|3|45.0365|9.0482
Ponte Nizza|3|44.8515|9.0972
Portalbera|3|45.0976|9.3189
Rea|3|45.1134|9.1547
Redavalle|3|45.0374|9.2039
Retorbido|3|44.9493|9.0362
Rivanazzano Terme|3|44.9308|9.0142
Robbio|4|45.29|8.5933
Robecco Pavese|3|45.0484|9.1502
Rocca de' Giorgi|3|44.9516|9.2536
Rocca Susella|3|44.9192|9.0941
Rognano|3|45.2885|9.0902
Romagnese|3|44.8395|9.3301
Roncaro|3|45.2282|9.2755
Rosasco|4|45.2511|8.5789
Rovescala|3|45.0114|9.3488
San Cipriano Po|3|45.1087|9.2829
San Damiano al Colle|3|45.0249|9.3466
San Genesio ed Uniti|3|45.2348|9.1786
San Giorgio di Lomellina|4|45.1744|8.7901
San Martino Siccomario|3|45.161|9.136
San Zenone al Po|3|45.1086|9.3618
Sannazzaro de' Burgondi|3|45.1023|8.9063
Sant'Alessio con Vialone|3|45.2247|9.2299
Sant'Angelo Lomellina|4|45.2471|8.6444
Santa Cristina e Bissone|3|45.1544|9.419
Santa Giuletta|3|45.0338|9.1815
Santa Margherita di Staffora|3|44.7648|9.2546
Santa Maria della Versa|3|44.9862|9.3002
Sartirana Lomellina|4|45.1138|8.6642
Scaldasole|3|45.125|8.9097
Semiana|4|45.1375|8.7293
Silvano Pietra|3|45.0404|8.9476
Siziano|3|45.3144|9.2032
Sommo|3|45.1307|9.0834
Spessa|3|45.1127|9.3494
Stradella|3|45.0774|9.295
Suardi|3|45.0347|8.7429
Torrazza Coste|3|44.9759|9.0878
Torre Beretti e Castellaro|3|45.0756|8.6905
Torre d'Arese|3|45.2428|9.3174
Torre d'Isola|3|45.2175|9.0761
Torre de' Negri|3|45.1497|9.3346
Torrevecchia Pia|3|45.2832|9.2966
Torricella Verzate|3|45.0179|9.1756
Travacò Siccomario|3|45.1491|9.1596
Trivolzio|3|45.2585|9.0427
Tromello|3|45.2091|8.8717
Trovo|3|45.283|9.0354
Val di Nizza|3|44.871|9.1758
Valeggio|3|45.1507|8.8599
Valle Lomellina|4|45.1531|8.6685
Valle Salimbene|3|45.1716|9.2345
Varzi|3|44.8235|9.1969
Velezzo Lomellina|4|45.1634|8.7372
Vellezzo Bellini|3|45.2707|9.0992
Verretto|3|45.0392|9.1085
Verrua Po|3|45.1096|9.1756
Vidigulfo|3|45.2923|9.2367
Vigevano|3|45.3171|8.8586
Villa Biscossi|3|45.0907|8.7871
Villanova d'Ardenghi|3|45.1717|9.0423
Villanterio|3|45.2195|9.3644
Vistarino|3|45.2108|9.3083
Voghera|3|44.9928|9.0086
Volpara|3|44.953|9.2971
Zavattarello|3|44.8685|9.2652
Zeccone|3|45.2579|9.2011
Zeme|4|45.1973|8.6659
Zenevredo|3|45.0543|9.3257
Zerbo|3|45.1105|9.3961
Zerbolò|3|45.2072|9.013
Zinasco|3|45.1128|9.0032
@SO|Sondrio
Albaredo per San Marco|3|46.1035|9.59
Albosaggia|3|46.1472|9.8532
Andalo Valtellino|4|46.1338|9.4738
Aprica|3|46.1527|10.1517
Ardenno|3|46.1643|9.6449
Bema|3|46.1082|9.5642
Berbenno di Valtellina|3|46.1689|9.7424
Bianzone|3|46.1882|10.1094
Bormio|3|46.4692|10.3722
Buglio in Monte|3|46.1828|9.6748
Caiolo|3|46.15|9.8145
Campodolcino|3|46.406|9.3519
Caspoggio|3|46.2635|9.8626
Castello dell'Acqua|3|46.146|10.0136
Castione Andevenno|3|46.1728|9.8002
Cedrasco|3|46.1493|9.767
Cercino|4|46.1581|9.5081
Chiavenna|3|46.32|9.3981
Chiesa in Valmalenco|3|46.2651|9.8486
Chiuro|3|46.1708|9.9894
Cino|4|46.1581|9.4861
Civo|3|46.1542|9.5606
Colorina|3|46.1537|9.7293
Cosio Valtellino|3|46.1337|9.5292
Dazio|3|46.1613|9.6008
Delebio|4|46.1361|9.4606
Dubino|4|46.1533|9.4615
Faedo Valtellino|3|46.153|9.9061
Forcola|3|46.1588|9.6708
Fusine|3|46.149|9.7491
Gerola Alta|3|46.0594|9.5508
Gordona|4|46.2923|9.3653
Grosio|3|46.2989|10.2745
Grosotto|3|46.2799|10.2584
Lanzada|3|46.2693|9.8692
Livigno|3|46.5378|10.1363
Lovero|3|46.2314|10.2286
Madesimo|3|46.4363|9.3584
Mantello|4|46.1525|9.4889
Mazzo di Valtellina|3|46.2586|10.2567
Mello|3|46.1553|9.5472
Mese|4|46.3063|9.3823
Montagna in Valtellina|3|46.1785|9.903
Morbegno|3|46.1324|9.5695
Novate Mezzola|3|46.2216|9.4498
Pedesina|4|46.0826|9.5507
Piantedo|4|46.1342|9.4293
Piateda|3|46.1596|9.935
Piuro|3|46.3301|9.4209
Poggiridenti|3|46.1748|9.9261
Ponte in Valtellina|3|46.175|9.9779
Postalesio|3|46.1741|9.7754
Prata Camportaccio|3|46.3072|9.3952
Rasura|4|46.1006|9.5527
Rogolo|4|46.1357|9.4873
Samolaco|4|46.2462|9.3951
San Giacomo Filippo|3|46.3377|9.3712
Sernio|3|46.2245|10.2041
Sondalo|3|46.3314|10.3249
Sondrio|3|46.3234|10.2584
Spriana|3|46.2203|9.864
Talamona|3|46.1385|9.6129
Tartano|3|46.1059|9.6786
Teglio|3|46.1727|10.0641
Tirano|3|46.2157|10.1732
Torre di Santa Maria|3|46.2335|9.8516
Tovo di Sant'Agata|3|46.2448|10.2465
Traona|3|46.1496|9.5258
Tresivio|3|46.1757|9.9426
Val Masino|3|46.2459|9.638
Valdidentro|3|46.489|10.2923
Valdisotto|3|46.4252|10.3574
Valfurva|3|46.4165|10.5125
Verceia|3|46.1987|9.4547
Vervio|3|46.2528|10.2402
Villa di Chiavenna|3|46.3245|9.494
Villa di Tirano|3|46.2039|10.1339
@VA|Varese
Agra|4|46.035|8.7717
Albizzate|4|45.7239|8.8031
Angera|4|45.7722|8.5751
Arcisate|4|45.8604|8.8596
Arsago Seprio|4|45.6882|8.7315
Azzate|4|45.7802|8.7938
Azzio|4|45.8852|8.7106
Barasso|4|45.8405|8.7568
Bardello con Malgesso e Bregano|4|45.835|8.6982
Bedero Valcuvia|4|45.9143|8.7942
Besano|4|45.889|8.8904
Besnate|4|45.7002|8.7683
Besozzo|4|45.8458|8.6665
Biandronno|4|45.8215|8.7132
Bisuschio|4|45.8749|8.8717
Bodio Lomnago|4|45.7912|8.751
Brebbia|4|45.8285|8.6501
Brenta|4|45.8932|8.6851
Brezzo di Bedero|4|45.9777|8.7179
Brinzio|4|45.8891|8.7904
Brissago-Valtravaglia|4|45.9486|8.7472
Brunello|4|45.7654|8.7974
Brusimpiano|4|45.9478|8.8892
Buguggiate|4|45.786|8.805
Busto Arsizio|4|45.6119|8.8521
Cadegliano-Viconago|4|45.9646|8.8309
Cadrezzate con Osmate|4|45.7899|8.6493
Cairate|4|45.6909|8.8725
Cantello|4|45.8199|8.8947
Caravate|4|45.8779|8.652
Cardano al Campo|4|45.6457|8.7725
Carnago|4|45.7228|8.8358
Caronno Pertusella|4|45.5949|9.0508
Caronno Varesino|4|45.7386|8.8312
Casale Litta|4|45.7673|8.7401
Casalzuigno|4|45.9116|8.7041
Casciago|4|45.8328|8.7843
Casorate Sempione|4|45.6734|8.7405
Cassano Magnago|4|45.6752|8.8256
Cassano Valcuvia|4|45.9324|8.7684
Castellanza|4|45.6124|8.897
Castello Cabiaglio|4|45.8934|8.756
Castelseprio|4|45.716|8.8627
Castelveccana|4|45.9449|8.6598
Castiglione Olona|4|45.7555|8.8669
Castronno|4|45.7468|8.8142
Cavaria con Premezzo|4|45.6927|8.7965
Cazzago Brabbia|4|45.7977|8.7332
Cislago|4|45.6588|8.9719
Cittiglio|4|45.8989|8.6607
Clivio|4|45.8642|8.9293
Cocquio-Trevisago|4|45.8634|8.6957
Comabbio|4|45.772|8.6744
Comerio|4|45.8396|8.7464
Cremenaga|4|45.9889|8.8022
Crosio della Valle|4|45.76|8.7704
Cuasso al Monte|4|45.9148|8.8791
Cugliate-Fabiasco|4|45.9435|8.8181
Cunardo|4|45.9375|8.8012
Curiglia con Monteviasco|4|46.0594|8.8265
Cuveglio|4|45.9113|8.7261
Cuvio|4|45.8962|8.7341
Daverio|4|45.7784|8.7718
Dumenza|4|46.0192|8.7871
Duno|4|45.9141|8.7372
Fagnano Olona|4|45.6689|8.8728
Ferno|4|45.6141|8.7545
Ferrera di Varese|4|45.9345|8.7858
Gallarate|4|45.6599|8.7932
Galliate Lombardo|4|45.7846|8.7709
Gavirate|4|45.8428|8.7177
Gazzada Schianno|4|45.781|8.8324
Gemonio|4|45.8792|8.6754
Gerenzano|4|45.6395|8.9982
Germignaga|4|45.9935|8.7242
Golasecca|4|45.6969|8.6556
Gorla Maggiore|4|45.6641|8.8909
Gorla Minore|4|45.6443|8.8979
Gornate Olona|4|45.7396|8.8598
Grantola|4|45.9492|8.7743
Inarzo|4|45.7853|8.7345
Induno Olona|4|45.8524|8.8396
Ispra|4|45.8155|8.6101
Jerago con Orago|4|45.708|8.794
Lavena Ponte Tresa|4|45.9597|8.8616
Laveno-Mombello|4|45.9095|8.612
Leggiuno|4|45.8754|8.6205
Lonate Ceppino|4|45.7045|8.8743
Lonate Pozzolo|4|45.5968|8.7547
Lozza|4|45.7757|8.8577
Luino|4|45.9989|8.7399
Luvinate|4|45.8393|8.7691
Maccagno con Pino e Veddasca|4|46.0737|8.7764
Malnate|4|45.8001|8.8782
Marchirolo|4|45.95|8.8323
Marnate|4|45.6293|8.9011
Marzio|4|45.9387|8.8592
Masciago Primo|4|45.9178|8.7811
Mercallo|4|45.7499|8.6696
Mesenzana|4|45.9478|8.7578
Montegrino Valtravaglia|4|45.9732|8.7688
Monvalle|4|45.8569|8.6337
Morazzone|4|45.765|8.8315
Mornago|4|45.7475|8.7523
Oggiona con Santo Stefano|4|45.6994|8.8184
Olgiate Olona|4|45.631|8.8898
Origgio|4|45.5977|9.0181
Orino|4|45.8816|8.7151
Porto Ceresio|4|45.9031|8.9049
Porto Valtravaglia|4|45.9614|8.6818
Rancio Valcuvia|4|45.916|8.771
Ranco|4|45.7976|8.5711
Saltrio|4|45.8739|8.9217
Samarate|4|45.6282|8.7843
Sangiano|4|45.8751|8.6333
Saronno|4|45.6257|9.0373
Sesto Calende|4|45.724|8.6344
Solbiate Arno|4|45.7191|8.8143
Solbiate Olona|4|45.6514|8.8878
Somma Lombardo|4|45.6836|8.7071
Sumirago|4|45.7392|8.781
Taino|4|45.7643|8.6151
Ternate|4|45.7823|8.6903
Tradate|4|45.7143|8.9041
Travedona-Monate|4|45.8051|8.6742
Tronzano Lago Maggiore|4|46.089|8.7339
Uboldo|4|45.6109|9.0034
Valganna|4|45.9|8.8201
Varano Borghi|4|45.7746|8.7037
Varese|4|45.8397|8.7542
Vedano Olona|4|45.7769|8.8856
Venegono Inferiore|4|45.7384|8.9011
Venegono Superiore|4|45.7514|8.9048
Vergiate|4|45.7248|8.694
Viggiù|4|45.8722|8.9059
Vizzola Ticino|4|45.6256|8.6962
#Marche
@AN|Ancona
Agugliano|2|43.5434|13.3866
Ancona|2|43.4801|13.2188
Arcevia|2|43.4995|12.9401
Barbara|2|43.5812|13.0265
Belvedere Ostrense|2|43.5805|13.1661
Camerano|2|43.5313|13.5516
Camerata Picena|2|43.5781|13.3527
Castelbellino|2|43.4868|13.1447
Castelfidardo|2|43.4646|13.5467
Castelleone di Suasa|2|43.6078|12.9761
Castelplanio|2|43.4931|13.0819
Cerreto d'Esi|2|43.3168|12.9871
Chiaravalle|2|43.6027|13.3246
Corinaldo|2|43.6488|13.0477
Cupramontana|2|43.4456|13.1156
Fabriano|2|43.3358|12.9046
Falconara Marittima|2|43.6294|13.3967
Filottrano|2|43.4367|13.3545
Genga|2|43.4297|12.935
Jesi|2|43.522|13.2444
Loreto|2|43.4395|13.607
Maiolati Spontini|2|43.4777|13.1218
Mergo|2|43.4724|13.0368
Monsano|2|43.5626|13.2501
Monte Roberto|2|43.4813|13.1384
Monte San Vito|2|43.6006|13.2682
Montecarotto|2|43.5263|13.063
Montemarciano|2|43.6389|13.3075
Morro d'Alba|2|43.6011|13.2138
Numana|2|43.5103|13.6226
Offagna|2|43.5277|13.4415
Osimo|2|43.4861|13.4824
Ostra|2|43.6125|13.1581
Ostra Vetere|2|43.6037|13.0582
Poggio San Marcello|2|43.5112|13.0737
Polverigi|2|43.5256|13.3921
Rosora|2|43.4833|13.0689
San Marcello|2|43.5761|13.2061
San Paolo di Jesi|2|43.4546|13.1728
Santa Maria Nuova|2|43.4941|13.3117
Sassoferrato|2|43.4327|12.8573
Senigallia|2|43.7149|13.2177
Serra de' Conti|2|43.5433|13.0372
Serra San Quirico|2|43.4477|13.0139
Sirolo|2|43.5247|13.6178
Staffolo|2|43.4331|13.1862
Trecastelli|2|43.6868|13.1098
@AP|Ascoli Piceno
Acquasanta Terme|2|42.7699|13.4102
Acquaviva Picena|2|42.9449|13.8151
Appignano del Tronto|2|42.8987|13.6664
Arquata del Tronto|1|42.7724|13.2966
Ascoli Piceno|2|42.8834|13.5396
Carassai|2|43.0321|13.685
Castel di Lama|2|42.8694|13.7133
Castignano|2|42.9393|13.624
Castorano|2|42.8981|13.728
Colli del Tronto|2|42.877|13.7484
Comunanza|2|42.9569|13.4129
Cossignano|2|42.9843|13.69
Cupra Marittima|2|43.025|13.8588
Folignano|2|42.8202|13.6343
Force|2|42.9633|13.4909
Grottammare|2|42.9905|13.8688
Maltignano|2|42.8322|13.688
Massignano|2|43.0506|13.7972
Monsampolo del Tronto|2|42.8969|13.7939
Montalto delle Marche|2|42.9899|13.6092
Montedinove|2|42.9707|13.5873
Montefiore dell'Aso|2|43.0519|13.7528
Montegallo|2|42.8474|13.3435
Montemonaco|2|42.8992|13.3269
Monteprandone|2|42.9199|13.8348
Offida|2|42.9348|13.691
Palmiano|2|42.8993|13.4584
Ripatransone|2|42.9962|13.7618
Roccafluvione|2|42.8599|13.4768
Rotella|2|42.9542|13.5594
San Benedetto del Tronto|2|42.9525|13.8807
Spinetoli|2|42.8891|13.773
Venarotta|2|42.8829|13.4923
@FM|Fermo
Altidona|2|43.1092|13.7999
Amandola|2|42.98|13.3561
Belmonte Piceno|2|43.0914|13.5397
Campofilone|2|43.0795|13.8148
Falerone|2|43.1071|13.4717
Fermo|2|43.0922|13.6388
Francavilla d'Ete|2|43.1874|13.5407
Grottazzolina|2|43.1117|13.603
Lapedona|2|43.11|13.7729
Magliano di Tenna|2|43.138|13.5872
Massa Fermana|2|43.1498|13.4754
Monsampietro Morico|2|43.0678|13.5557
Montappone|2|43.1365|13.4685
Monte Giberto|2|43.0913|13.6307
Monte Rinaldo|2|43.0283|13.5802
Monte San Pietrangeli|2|43.1894|13.5754
Monte Urano|2|43.2027|13.6729
Monte Vidon Combatte|2|43.0501|13.631
Monte Vidon Corrado|2|43.1207|13.4876
Montefalcone Appennino|2|42.99|13.4569
Montefortino|2|42.9431|13.3448
Montegiorgio|2|43.1323|13.5364
Montegranaro|2|43.2325|13.6316
Monteleone di Fermo|2|43.0479|13.5285
Montelparo|2|43.0178|13.5374
Monterubbiano|2|43.0848|13.7199
Montottone|2|43.0621|13.5901
Moresco|2|43.0856|13.731
Ortezzano|2|43.0301|13.606
Pedaso|2|43.0992|13.8408
Petritoli|2|43.0677|13.6592
Ponzano di Fermo|2|43.1011|13.6568
Porto San Giorgio|2|43.1827|13.7934
Porto Sant'Elpidio|2|43.259|13.757
Rapagnano|2|43.1613|13.5929
Sant'Elpidio a Mare|2|43.2347|13.6879
Santa Vittoria in Matenano|2|43.0194|13.496
Servigliano|2|43.0816|13.4938
Smerillo|2|43.0052|13.445
Torre San Patrizio|2|43.1829|13.6128
@MC|Macerata
Apiro|2|43.3923|13.1312
Appignano|2|43.3637|13.3466
Belforte del Chienti|2|43.1626|13.2454
Bolognola|2|42.9941|13.2278
Caldarola|2|43.1385|13.2248
Camerino|2|43.1358|13.0683
Camporotondo di Fiastrone|2|43.1325|13.266
Castelraimondo|2|43.2082|13.0537
Castelsantangelo sul Nera|1|42.8945|13.1539
Cessapalombo|2|43.1088|13.258
Cingoli|2|43.3738|13.2163
Civitanova Marche|2|43.3055|13.7229
Colmurano|2|43.1638|13.357
Corridonia|2|43.2485|13.5092
Esanatoglia|2|43.2522|12.9478
Fiastra|2|43.0361|13.1555
Fiuminata|2|43.1874|12.9322
Gagliole|2|43.2383|13.0673
Gualdo|2|43.0668|13.341
Loro Piceno|2|43.1661|13.4164
Macerata|2|43.153|13.1509
Matelica|2|43.2566|13.0105
Mogliano|2|43.1865|13.481
Monte Cavallo|1|42.9551|12.9739
Monte San Giusto|2|43.2364|13.5951
Monte San Martino|2|43.032|13.4387
Montecassiano|2|43.3638|13.4357
Montecosaro|2|43.317|13.6353
Montefano|2|43.4112|13.4384
Montelupone|2|43.3442|13.5676
Morrovalle|2|43.3146|13.5795
Muccia|1|43.0817|13.043
Penna San Giovanni|2|43.0569|13.4255
Petriolo|2|43.2217|13.4653
Pieve Torina|1|43.0433|13.0489
Pioraco|2|43.179|12.9857
Poggio San Vicino|2|43.3752|13.0791
Pollenza|2|43.2678|13.3478
Porto Recanati|2|43.4351|13.663
Potenza Picena|2|43.3664|13.6207
Recanati|2|43.4035|13.5486
Ripe San Ginesio|2|43.143|13.3673
San Ginesio|2|43.5301|12.9613
San Severino Marche|2|43.229|13.178
Sant'Angelo in Pontano|2|43.0986|13.3968
Sarnano|2|43.0354|13.2983
Sefro|2|43.1472|12.9486
Serrapetrona|2|43.1774|13.1898
Serravalle di Chienti|1|43.0717|12.9524
Tolentino|2|43.2088|13.2844
Treia|2|43.3106|13.3115
Urbisaglia|2|43.1966|13.3766
Ussita|2|42.9438|13.1379
Valfornace|2|43.0669|13.115
Visso|1|42.9312|13.0874
@PU|Pesaro e Urbino
Acqualagna|2|43.6259|12.676
Apecchio|2|43.5586|12.421
Belforte all'Isauro|2|43.7166|12.376
Borgo Pace|2|43.6571|12.2936
Cagli|2|43.5457|12.6518
Cantiano|2|43.4743|12.6288
Carpegna|2|43.7814|12.3364
Cartoceto|2|43.7657|12.8835
Colli al Metauro|2|43.7423|12.9089
Fano|2|43.8424|13.0147
Fermignano|2|43.6768|12.6454
Fossombrone|2|43.6908|12.8126
Fratte Rosa|2|43.632|12.9018
Frontino|2|43.7646|12.3767
Frontone|2|43.5137|12.7345
Gabicce Mare|2|43.9669|12.7563
Gradara|2|43.9389|12.7713
Isola del Piano|2|43.7378|12.7841
Lunano|2|43.7305|12.4414
Macerata Feltria|2|43.8034|12.4434
Mercatello sul Metauro|2|43.6474|12.3366
Mercatino Conca|2|43.8702|12.4911
Mombaroccio|2|43.7951|12.8548
Mondavio|2|43.6742|12.9688
Mondolfo|2|43.7508|13.0969
Monte Cerignone|2|43.8405|12.4147
Monte Grimano Terme|2|43.8677|12.4712
Monte Porzio|2|43.6897|13.0457
Montecalvo in Foglia|2|43.8116|12.6311
Montefelcino|2|43.7348|12.834
Montelabbate|2|43.8489|12.788
Peglio|2|43.6965|12.4979
Pergola|2|43.5632|12.8363
Pesaro|2|43.9098|12.9131
Petriano|2|43.7792|12.7334
Piandimeleto|2|43.7242|12.411
Pietrarubbia|2|43.7977|12.3827
Piobbico|2|43.5893|12.5094
San Costanzo|2|43.7662|13.0728
San Lorenzo in Campo|2|43.6041|12.9457
Sant'Angelo in Vado|2|43.6632|12.4054
Sant'Ippolito|2|43.6857|12.8717
Sassocorvaro Auditore|2|43.8103|12.5402
Serra Sant'Abbondio|2|43.4914|12.7722
Tavoleto|2|43.8439|12.5939
Tavullia|2|43.8978|12.7548
Terre Roveresche|2|43.7006|12.9577
Urbania|2|43.6683|12.5241
Urbino|2|43.7263|12.6363
Vallefoglia|2|43.8284|12.7247
#Molise
@CB|Campobasso
Acquaviva Collecroce|2|41.8676|14.7468
Baranello|1|41.526|14.5594
Bojano|1|41.4857|14.4729
Bonefro|2|41.7045|14.9333
Busso|2|41.5563|14.5585
Campobasso|2|41.7173|14.8262
Campochiaro|1|41.4475|14.5089
Campodipietra|2|41.557|14.746
Campolieto|2|41.6325|14.7654
Campomarino|2|41.9563|15.0343
Casacalenda|2|41.7358|14.8467
Casalciprano|2|41.5804|14.5281
Castelbottaccio|2|41.7531|14.7066
Castellino del Biferno|2|41.7016|14.7311
Castelmauro|2|41.8291|14.7103
Castropignano|2|41.6183|14.5598
Cercemaggiore|2|41.4613|14.7231
Cercepiccola|2|41.4601|14.6654
Civitacampomarano|2|41.7804|14.69
Colle d'Anchise|1|41.5063|14.5168
Colletorto|2|41.6629|14.9734
Duronia|2|41.6589|14.4584
Ferrazzano|2|41.5309|14.671
Fossalto|2|41.6729|14.5457
Gambatesa|2|41.5099|14.9121
Gildone|2|41.5101|14.7392
Guardialfiera|2|41.8042|14.7929
Guardiaregia|1|41.435|14.5417
Guglionesi|3|41.9139|14.9136
Jelsi|2|41.5179|14.7987
Larino|2|41.8056|14.9211
Limosano|2|41.6763|14.6224
Lucito|2|41.7319|14.6872
Lupara|2|41.7627|14.733
Macchia Valfortore|2|41.595|14.9117
Mafalda|3|41.9417|14.7132
Matrice|2|41.6141|14.7102
Mirabello Sannitico|2|41.516|14.6725
Molise|2|41.6308|14.4929
Monacilioni|2|41.6099|14.8085
Montagano|2|41.6449|14.6751
Montecilfone|2|41.9025|14.8364
Montefalcone nel Sannio|2|41.8666|14.6382
Montelongo|2|41.7366|14.953
Montemitro|3|41.888|14.6468
Montenero di Bisaccia|3|42.0654|14.7896
Montorio nei Frentani|2|41.7596|14.9327
Morrone del Sannio|2|41.7115|14.7798
Oratino|2|41.5848|14.5875
Palata|2|41.8905|14.7854
Petacciato|3|42.0114|14.8609
Petrella Tifernina|2|41.6918|14.6954
Pietracatella|2|41.5812|14.8737
Pietracupa|2|41.6825|14.5193
Portocannone|2|41.9151|15.0093
Provvidenti|2|41.7188|14.8224
Riccia|2|41.484|14.8351
Ripabottoni|2|41.6892|14.8083
Ripalimosani|2|41.611|14.6627
Roccavivara|2|41.8342|14.5999
Rotello|2|41.7469|15.0064
Salcito|2|41.7475|14.5101
San Biase|2|41.7155|14.5888
San Felice del Molise|3|41.891|14.7005
San Giacomo degli Schiavoni|3|41.9632|14.9464
San Giovanni in Galdo|2|41.59|14.7503
San Giuliano del Sannio|1|41.4564|14.6412
San Giuliano di Puglia|2|41.6845|14.9644
San Martino in Pensilis|2|41.8704|15.0112
San Massimo|1|41.4929|14.4102
San Polo Matese|1|41.4593|14.4934
Sant'Angelo Limosano|2|41.6933|14.6034
Sant'Elia a Pianisi|2|41.6204|14.8752
Santa Croce di Magliano|2|41.7124|14.9934
Sepino|1|41.408|14.6183
Spinete|1|41.5449|14.4862
Tavenna|3|41.9086|14.7625
Termoli|3|41.9983|14.9939
Torella del Sannio|2|41.6398|14.5195
Toro|2|41.5724|14.7649
Trivento|2|41.7814|14.5511
Tufara|2|41.4817|14.9465
Ururi|2|41.8165|15.0161
Vinchiaturo|1|41.4929|14.5907
@IS|Isernia
Acquaviva d'Isernia|1|41.6721|14.1489
Agnone|2|41.8096|14.377
Bagnoli del Trigno|2|41.703|14.4565
Belmonte del Sannio|2|41.8239|14.4221
Cantalupo nel Sannio|1|41.5218|14.3929
Capracotta|2|41.8339|14.2642
Carovilli|2|41.7142|14.294
Carpinone|1|41.5904|14.3233
Castel del Giudice|2|41.8546|14.231
Castel San Vincenzo|1|41.6554|14.0624
Castelpetroso|1|41.5594|14.345
Castelpizzuto|1|41.5217|14.2923
Castelverrino|2|41.7664|14.3976
Cerro al Volturno|1|41.6559|14.1023
Chiauci|2|41.6778|14.3855
Civitanova del Sannio|2|41.6679|14.4038
Colli a Volturno|1|41.5987|14.1049
Conca Casale|2|41.4951|14.0068
Filignano|1|41.5453|14.0562
Forlì del Sannio|1|41.6959|14.1795
Fornelli|1|41.6067|14.1395
Frosolone|2|41.6006|14.4465
Isernia|1|41.6495|14.2081
Longano|1|41.5216|14.2456
Macchia d'Isernia|1|41.5616|14.1671
Macchiagodena|1|41.5598|14.4078
Miranda|1|41.6451|14.2463
Montaquila|1|41.5667|14.1126
Montenero Val Cocchiara|1|41.7168|14.0694
Monteroduni|1|41.5211|14.177
Pesche|1|41.6111|14.282
Pescolanciano|2|41.6784|14.3372
Pescopennataro|2|41.879|14.2933
Pettoranello del Molise|1|41.5731|14.2775
Pietrabbondante|2|41.7471|14.3844
Pizzone|1|41.6669|14.0356
Poggio Sannita|2|41.7788|14.4142
Pozzilli|1|41.5114|14.0625
Rionero Sannitico|1|41.7119|14.1386
Roccamandolfi|1|41.4971|14.3538
Roccasicura|1|41.6968|14.2335
Rocchetta a Volturno|1|41.6246|14.0863
San Pietro Avellana|1|41.7906|14.1822
Sant'Agapito|1|41.5446|14.2229
Sant'Angelo del Pesco|2|41.8826|14.2549
Sant'Elena Sannita|1|41.5758|14.4696
Santa Maria del Molise|1|41.5527|14.3682
Scapoli|1|41.6155|14.0587
Sessano del Molise|2|41.6382|14.3316
Sesto Campano|2|41.4204|14.0778
Vastogirardi|2|41.7741|14.2604
Venafro|2|41.4834|14.0451
#Piemonte
@AL|Alessandria
Acqui Terme|3|44.6751|8.4675
Albera Ligure|3|44.7024|9.0662
Alessandria|3|44.835|8.745
Alfiano Natta|4|45.0486|8.2083
Alice Bel Colle|3|44.726|8.4507
Alluvioni Piovera|3|44.9825|8.7524
Altavilla Monferrato|4|44.9936|8.3759
Alzano Scrivia|3|45.0181|8.8806
Arquata Scrivia|3|44.6878|8.8853
Avolasca|3|44.8028|8.9651
Balzola|4|45.183|8.4027
Basaluzzo|3|44.7679|8.7048
Bassignana|4|45.0016|8.7346
Belforte Monferrato|3|44.625|8.6613
Bergamasco|4|44.8272|8.4547
Berzano di Tortona|3|44.8764|8.9497
Bistagno|3|44.6615|8.3695
Borghetto di Borbera|3|44.7309|8.9453
Borgo San Martino|4|45.091|8.5258
Borgoratto Alessandrino|3|44.8362|8.5385
Bosco Marengo|3|44.8256|8.6772
Bosio|3|44.65|8.7924
Bozzole|4|45.0702|8.6065
Brignano-Frascata|3|44.8101|9.0426
Cabella Ligure|3|44.6738|9.0958
Camagna Monferrato|4|45.0177|8.4297
Camino|4|45.1621|8.2874
Cantalupo Ligure|3|44.7182|9.045
Capriata d'Orba|3|44.7278|8.6908
Carbonara Scrivia|3|44.8494|8.8697
Carentino|4|44.8287|8.4713
Carezzano|3|44.8069|8.9002
Carpeneto|3|44.6772|8.6064
Carrega Ligure|3|44.619|9.1756
Carrosio|3|44.6582|8.8316
Cartosio|3|44.5918|8.4201
Casal Cermelli|3|44.8349|8.6249
Casale Monferrato|4|45.1363|8.4498
Casaleggio Boiro|3|44.6335|8.7305
Casalnoceto|3|44.9132|8.9812
Casasco|3|44.8283|9.0058
Cassano Spinola|3|44.7662|8.8632
Cassine|3|44.7499|8.5278
Cassinelle|3|44.6015|8.5634
Castellania Coppi|3|44.7983|8.9305
Castellar Guidobono|3|44.9057|8.9483
Castellazzo Bormida|3|44.8451|8.5772
Castelletto d'Erro|3|44.6256|8.3943
Castelletto d'Orba|3|44.6845|8.704
Castelletto Merli|4|45.0745|8.2406
Castelletto Monferrato|4|44.9811|8.5645
Castelnuovo Bormida|3|44.7426|8.5485
Castelnuovo Scrivia|3|44.9802|8.8804
Castelspina|3|44.8061|8.5831
Cavatore|3|44.6303|8.4542
Cella Monte|4|45.0749|8.3912
Cereseto|4|45.0877|8.3199
Cerreto Grue|3|44.8422|8.9311
Cerrina Monferrato|4|45.1214|8.2138
Coniolo|4|45.1469|8.3715
Conzano|4|45.0197|8.4564
Costa Vescovato|3|44.8164|8.9269
Cremolino|3|44.6359|8.5852
Denice|3|44.5988|8.3331
Dernice|3|44.7669|9.0508
Fabbrica Curone|3|44.785|9.1476
Felizzano|4|44.9|8.4362
Fraconalto|3|44.591|8.8785
Francavilla Bisio|3|44.7346|8.7313
Frascaro|3|44.8264|8.5322
Frassinello Monferrato|4|45.0318|8.3876
Frassineto Po|4|45.1334|8.5339
Fresonara|3|44.7829|8.6861
Frugarolo|3|44.8372|8.6815
Fubine Monferrato|4|44.9628|8.4299
Gabiano|4|45.1568|8.1952
Gamalero|3|44.809|8.5416
Garbagna|3|44.7805|8.9979
Gavi|3|44.6876|8.8094
Giarole|4|45.0606|8.5665
Gremiasco|3|44.7963|9.1069
Grognardo|3|44.6305|8.4929
Grondona|3|44.6964|8.9655
Guazzora|3|45.0138|8.8436
Isola Sant'Antonio|3|45.0305|8.8487
Lerma|3|44.636|8.7155
Lu e Cuccaro Monferrato|4|44.9966|8.4743
Malvicino|3|44.5593|8.4131
Masio|4|44.8696|8.4077
Melazzo|3|44.6439|8.4249
Merana|3|44.5188|8.2981
Mirabello Monferrato|4|45.0356|8.5232
Molare|3|44.6186|8.6006
Molino dei Torti|3|45.0234|8.8922
Mombello Monferrato|4|45.1329|8.2503
Momperone|3|44.8384|9.0353
Moncestino|4|45.1548|8.1614
Mongiardino Ligure|3|44.6401|9.0619
Monleale|3|44.8871|8.9803
Montacuto|3|44.7665|9.105
Montaldeo|3|44.6671|8.7302
Montaldo Bormida|3|44.6826|8.5878
Montecastello|3|44.9495|8.6857
Montechiaro d'Acqui|3|44.5949|8.3796
Montegioco|3|44.8418|8.963
Montemarzino|3|44.8483|8.9936
Morano sul Po|4|45.1642|8.3657
Morbello|3|44.5908|8.5184
Mornese|3|44.6392|8.7562
Morsasco|3|44.6653|8.5508
Murisengo|4|45.0838|8.1372
Novi Ligure|3|44.7608|8.7896
Occimiano|4|45.0603|8.5076
Odalengo Grande|4|45.1098|8.1669
Odalengo Piccolo|4|45.0717|8.206
Olivola|4|45.0374|8.3675
Orsara Bormida|3|44.6901|8.5627
Ottiglio|4|45.0543|8.3384
Ovada|3|44.6383|8.6453
Oviglio|4|44.8612|8.4877
Ozzano Monferrato|4|45.1089|8.3702
Paderna|3|44.8207|8.8916
Pareto|3|44.5164|8.3822
Parodi Ligure|3|44.6697|8.7587
Pasturana|3|44.7508|8.7493
Pecetto di Valenza|4|44.9898|8.6709
Pietra Marazzi|3|44.9438|8.6701
Pomaro Monferrato|4|45.0629|8.5947
Pontecurone|3|44.9605|8.9336
Pontestura|4|45.1433|8.3334
Ponti|3|44.6275|8.3654
Ponzano Monferrato|4|45.0849|8.2655
Ponzone|3|44.5882|8.4587
Pozzol Groppo|3|44.8781|9.0299
Pozzolo Formigaro|3|44.7952|8.7848
Prasco|3|44.6392|8.5519
Predosa|3|44.7526|8.6583
Quargnento|4|44.945|8.4874
Quattordio|4|44.8963|8.4049
Ricaldone|3|44.7319|8.4678
Rivalta Bormida|3|44.7114|8.5501
Rivarone|3|44.9769|8.7156
Rocca Grimalda|3|44.6714|8.6485
Roccaforte Ligure|3|44.6775|9.0287
Rocchetta Ligure|3|44.7066|9.0505
Rosignano Monferrato|4|45.0799|8.3985
Sala Monferrato|4|45.0752|8.3587
Sale|3|44.9807|8.8093
San Cristoforo|3|44.6922|8.7502
San Giorgio Monferrato|4|45.1077|8.4131
San Salvatore Monferrato|4|44.9942|8.5659
San Sebastiano Curone|3|44.7858|9.0647
Sant'Agata Fossili|3|44.7848|8.9212
Sardigliano|3|44.7529|8.8963
Sarezzano|3|44.8676|8.9127
Serralunga di Crea|4|45.1003|8.282
Serravalle Scrivia|3|44.7256|8.8547
Sezzadio|3|44.7848|8.5725
Silvano d'Orba|3|44.6869|8.675
Solero|4|44.9185|8.5119
Solonghello|4|45.1291|8.2832
Spigno Monferrato|3|44.5431|8.3339
Spineto Scrivia|3|44.8374|8.8738
Stazzano|3|44.7274|8.8677
Strevi|3|44.6981|8.5218
Tagliolo Monferrato|3|44.6383|8.6659
Tassarolo|3|44.7285|8.7716
Terruggia|4|45.0823|8.4432
Terzo|3|44.6704|8.4216
Ticineto|4|45.098|8.5557
Tortona|3|44.8967|8.8641
Treville|4|45.0969|8.3595
Trisobbio|3|44.6616|8.5861
Valenza|4|45.014|8.6458
Valmacca|4|45.1008|8.5828
Vignale Monferrato|4|45.0113|8.3961
Vignole Borbera|3|44.7099|8.8913
Viguzzolo|3|44.9055|8.9186
Villadeati|4|45.0723|8.1679
Villalvernia|3|44.8154|8.8573
Villamiroglio|4|45.1347|8.1703
Villanova Monferrato|4|45.1829|8.4792
Villaromagnano|3|44.8497|8.8878
Visone|3|44.6618|8.5007
Volpedo|3|44.8904|8.9823
Volpeglino|3|44.8925|8.9601
Voltaggio|3|44.6204|8.8427
@AT|Asti
Agliano Terme|4|44.791|8.25
Albugnano|4|45.078|7.9712
Antignano|4|44.8451|8.1348
Aramengo|4|45.1011|8.0005
Asti|4|44.826|8.2027
Azzano d'Asti|4|44.8746|8.2678
Baldichieri d'Asti|4|44.9059|8.0916
Belveglio|4|44.8304|8.3302
Berzano di San Pietro|4|45.0948|7.953
Bruno|4|44.7932|8.4405
Bubbio|4|44.6637|8.2951
Buttigliera d'Asti|4|45.0226|7.9508
Calamandrana|4|44.737|8.3342
Calliano Monferrato|4|45.0078|8.2569
Calosso|4|44.7398|8.2275
Camerano Casasco|4|44.991|8.0912
Canelli|4|44.7193|8.2871
Cantarana|4|44.9005|8.0302
Capriglio|4|45.0041|8.008
Casorzo Monferrato|4|45.0234|8.3345
Cassinasco|4|44.6891|8.3032
Castagnole delle Lanze|4|44.7511|8.1502
Castagnole Monferrato|4|44.9616|8.3062
Castel Boglione|4|44.7204|8.3801
Castel Rocchero|4|44.7183|8.4153
Castell'Alfero|4|44.9821|8.2099
Castellero|4|44.9243|8.0745
Castelletto Molina|4|44.751|8.4331
Castello di Annone|4|44.879|8.3139
Castelnuovo Belbo|4|44.8015|8.4122
Castelnuovo Calcea|4|44.7881|8.2853
Castelnuovo Don Bosco|4|45.0408|7.9631
Cellarengo|4|44.8667|7.9447
Celle Enomondo|4|44.8573|8.1224
Cerreto d'Asti|4|45.0521|8.0351
Cerro Tanaro|4|44.8724|8.3602
Cessole|4|44.6489|8.2436
Chiusano d'Asti|4|44.9857|8.1172
Cinaglio|4|44.9752|8.1
Cisterna d'Asti|4|44.825|8.0046
Coazzolo|4|44.7284|8.1453
Cocconato|4|45.0875|8.0392
Corsione|4|45.0009|8.1461
Cortandone|4|44.959|8.0578
Cortanze|4|45.015|8.0894
Cortazzone|4|44.9796|8.0617
Cortiglione|4|44.8228|8.3589
Cossombrato|4|44.9943|8.1367
Costigliole d'Asti|4|44.7864|8.1822
Cunico|4|45.0399|8.0967
Dusino San Michele|4|44.9255|7.9722
Ferrere|4|44.8754|7.9947
Fontanile|4|44.7533|8.4224
Frinco|4|45.0049|8.1688
Grana Monferrato|4|44.9984|8.2994
Grazzano Badoglio|4|45.0396|8.3136
Incisa Scapaccino|4|44.8085|8.3734
Isola d'Asti|4|44.8294|8.1775
Loazzolo|4|44.669|8.2584
Maranzana|3|44.7606|8.4783
Maretto|4|44.9447|8.0343
Moasca|4|44.7627|8.2778
Mombaldone|3|44.5696|8.3302
Mombaruzzo|3|44.7713|8.4489
Mombercelli|4|44.8177|8.2947
Monale|4|44.9361|8.0719
Monastero Bormida|4|44.6485|8.3266
Moncalvo|4|45.0502|8.2652
Moncucco Torinese|4|45.0681|7.9325
Mongardino|4|44.8492|8.2185
Montabone|4|44.6987|8.3906
Montafia|4|44.9893|8.0249
Montaldo Scarampi|4|44.8303|8.2591
Montechiaro d'Asti|4|45.0078|8.1122
Montegrosso d'Asti|4|44.8239|8.2398
Montemagno Monferrato|4|44.9837|8.3236
Montiglio Monferrato|4|45.0645|8.0989
Moransengo-Tonengo|4|45.1152|8.0249
Nizza Monferrato|4|44.7733|8.3537
Olmo Gentile|4|44.5858|8.2472
Passerano Marmorito|4|45.0558|8.0187
Penango|4|45.0332|8.2503
Piea|4|45.0251|8.0718
Pino d'Asti|4|45.0575|7.9862
Piovà Massaia|4|45.0545|8.0493
Portacomaro|4|44.9574|8.2581
Quaranti|3|44.7509|8.4491
Refrancore|4|44.9363|8.3437
Revigliasco d'Asti|4|44.8585|8.1582
Roatto|4|44.9516|8.027
Robella|4|45.1017|8.1019
Rocca d'Arazzo|4|44.8732|8.2858
Roccaverano|4|44.5922|8.2719
Rocchetta Palafea|4|44.7067|8.346
Rocchetta Tanaro|4|44.8587|8.3457
San Damiano d'Asti|4|44.8334|8.0635
San Giorgio Scarampi|4|44.6113|8.2424
San Martino Alfieri|4|44.8186|8.1092
San Marzano Oliveto|4|44.754|8.2958
San Paolo Solbrito|4|44.9506|7.9706
Scurzolengo|4|44.9658|8.2785
Serole|4|44.5539|8.2596
Sessame|4|44.6695|8.3373
Settime|4|44.9625|8.114
Soglio|4|44.9963|8.0785
Tigliole|4|44.887|8.0754
Tonco|4|45.0245|8.19
Vaglio Serra|4|44.7964|8.339
Valfenera|4|44.9017|7.9643
Vesime|4|44.6369|8.2282
Viale|4|45.0007|8.0501
Viarigi|4|44.9805|8.3585
Vigliano d'Asti|4|44.8354|8.2319
Villa San Secondo|4|45.0051|8.1352
Villafranca d'Asti|4|44.9133|8.0325
Villanova d'Asti|4|44.9419|7.9375
Vinchio|4|44.8073|8.3174
@BI|Biella
Ailoche|4|45.6983|8.2212
Andorno Micca|3|45.6093|8.0527
Benna|4|45.5137|8.1266
Biella|3|45.567|8.0869
Bioglio|4|45.6068|8.1297
Borriana|4|45.5062|8.0386
Brusnengo|4|45.5939|8.2519
Callabiana|4|45.6314|8.0972
Camandona|4|45.6442|8.0997
Camburzano|3|45.5437|8.0031
Campiglia Cervo|3|45.6628|7.9999
Candelo|4|45.5462|8.1126
Caprile|4|45.6898|8.2163
Casapinta|4|45.6161|8.1957
Castelletto Cervo|4|45.5162|8.2267
Cavaglià|4|45.4077|8.0934
Cerrione|4|45.4684|8.0681
Coggiola|4|45.6881|8.1763
Cossato|4|45.5699|8.18
Crevacuore|4|45.6869|8.2467
Curino|4|45.6276|8.2373
Donato|3|45.5282|7.9086
Dorzano|4|45.4261|8.0985
Gaglianico|4|45.5379|8.075
Gifflenga|4|45.4931|8.2322
Graglia|3|45.5586|7.978
Lessona|4|45.5873|8.1943
Magnano|3|45.4621|8.0045
Massazza|4|45.4914|8.1645
Masserano|4|45.5946|8.2242
Mezzana Mortigliengo|4|45.6266|8.1895
Miagliano|3|45.6135|8.0447
Mongrando|3|45.5277|8.0106
Mottalciata|4|45.5051|8.2067
Muzzano|3|45.5608|7.9889
Netro|3|45.5379|7.9455
Occhieppo Inferiore|3|45.5561|8.0215
Occhieppo Superiore|3|45.5651|8.0013
Pettinengo|4|45.6131|8.1042
Piatto|4|45.5899|8.1353
Piedicavallo|3|45.6898|7.9548
Pollone|3|45.5798|8.0059
Ponderano|4|45.5385|8.0559
Portula|4|45.6753|8.1794
Pralungo|3|45.5921|8.0379
Pray|4|45.6762|8.2087
Quaregna Cerreto|4|45.575|8.1614
Ronco Biellese|4|45.5814|8.0988
Roppolo|4|45.4206|8.0697
Rosazza|3|45.6758|7.9771
Sagliano Micca|3|45.6258|8.0433
Sala Biellese|3|45.5082|7.9584
Salussola|4|45.4493|8.1092
Sandigliano|4|45.5186|8.0775
Sordevolo|3|45.5736|7.9742
Sostegno|4|45.6529|8.2697
Strona|4|45.6166|8.1691
Tavigliano|3|45.6233|8.0529
Ternengo|4|45.5897|8.116
Tollegno|3|45.593|8.0517
Torrazzo|3|45.4984|7.9536
Valdengo|4|45.5673|8.1369
Valdilana|4|45.6661|8.1443
Vallanzengo|4|45.6033|8.1504
Valle San Nicolao|4|45.607|8.1412
Veglio|4|45.6406|8.1141
Verrone|4|45.5037|8.119
Vigliano Biellese|4|45.5645|8.1045
Villa del Bosco|4|45.6206|8.2796
Villanova Biellese|4|45.4816|8.1943
Viverone|4|45.4256|8.0512
Zimone|4|45.4493|8.0358
Zubiena|3|45.4928|7.9977
Zumaglia|4|45.5939|8.0894
@CN|Cuneo
Acceglio|3S|44.4746|6.9909
Aisone|3S|44.3139|7.2196
Alba|4|44.7007|8.0358
Albaretto della Torre|4|44.5959|8.0641
Alto|3S|44.1089|8.0031
Argentera|3S|44.3746|6.9542
Arguello|4|44.5827|8.1108
Bagnasco|3|44.3013|8.0431
Bagnolo Piemonte|3S|44.7603|7.3139
Baldissero d'Alba|4|44.7595|7.9143
Barbaresco|4|44.7254|8.0807
Barge|3S|44.7275|7.321
Barolo|4|44.6108|7.9428
Bastia Mondovì|4|44.4419|7.8944
Battifollo|3|44.3198|8.0109
Beinette|3|44.3648|7.6467
Bellino|3S|44.5823|6.9908
Belvedere Langhe|4|44.493|7.9746
Bene Vagienna|4|44.5433|7.8283
Benevello|4|44.6298|8.1041
Bergolo|4|44.5478|8.1831
Bernezzo|3S|44.3853|7.4363
Bonvicino|4|44.5035|8.0175
Borgo San Dalmazzo|3S|44.3287|7.4875
Borgomale|4|44.6203|8.1322
Bosia|4|44.6024|8.1473
Bossolasco|4|44.5293|8.0509
Boves|3S|44.3296|7.5519
Bra|3|44.6977|7.8543
Briaglia|4|44.3957|7.876
Briga Alta|3S|44.1489|7.7305
Brondello|3S|44.6007|7.4059
Brossasco|3S|44.5698|7.3616
Busca|3S|44.5181|7.4743
Camerana|4|44.424|8.1414
Canale|4|44.7985|7.9973
Canosio|3S|44.4558|7.0827
Caprauna|3S|44.1189|7.9503
Caraglio|3S|44.417|7.4326
Caramagna Piemonte|3|44.7822|7.7394
Cardè|3|44.7444|7.4776
Carrù|4|44.481|7.8744
Cartignano|3S|44.4777|7.2878
Casalgrasso|3|44.8196|7.6246
Castagnito|4|44.7554|8.0313
Casteldelfino|3S|44.5896|7.0703
Castelletto Stura|3|44.4418|7.6386
Castelletto Uzzone|4|44.4943|8.1867
Castellinaldo d'Alba|4|44.775|8.03
Castellino Tanaro|4|44.4278|7.9812
Castelmagno|3S|44.4093|7.2072
Castelnuovo di Ceva|3|44.3536|8.1289
Castiglione Falletto|4|44.6237|7.9775
Castiglione Tinella|4|44.7253|8.1901
Castino|4|44.6178|8.1824
Cavallerleone|3|44.7401|7.6639
Cavallermaggiore|3|44.7098|7.6863
Celle di Macra|3S|44.4829|7.1797
Centallo|3|44.5015|7.5878
Ceresole Alba|3|44.7997|7.8224
Cerretto Langhe|4|44.5748|8.0979
Cervasca|3S|44.3809|7.4712
Cervere|3|44.6354|7.7919
Ceva|4|44.3873|8.033
Cherasco|3|44.6522|7.858
Chiusa di Pesio|3|44.3264|7.6754
Cigliè|4|44.4365|7.9265
Cissone|4|44.5631|8.0304
Clavesana|4|44.4819|7.9121
Corneliano d'Alba|4|44.7359|7.9599
Cortemilia|4|44.5795|8.1933
Cossano Belbo|4|44.669|8.1986
Costigliole Saluzzo|3S|44.5645|7.4854
Cravanzana|4|44.5746|8.1262
Crissolo|3S|44.6992|7.1577
Cuneo|3S|44.4581|7.5581
Demonte|3S|44.3153|7.2975
Diano d'Alba|4|44.6503|8.0275
Dogliani|4|44.5308|7.9472
Dronero|3S|44.4659|7.3673
Elva|3S|44.5403|7.0903
Entracque|3S|44.2414|7.3993
Envie|3S|44.6822|7.3711
Farigliano|4|44.512|7.9142
Faule|3|44.8062|7.5851
Feisoglio|4|44.5437|8.1049
Fossano|3|44.5493|7.725
Frabosa Soprana|3|44.2878|7.8066
Frabosa Sottana|3|44.3022|7.798
Frassino|3S|44.5716|7.276
Gaiola|3S|44.3352|7.4068
Gambasca|3S|44.6287|7.3473
Garessio|3|44.2029|8.0193
Genola|3|44.5889|7.6645
Gorzegno|4|44.5128|8.1351
Gottasecca|4|44.4601|8.1675
Govone|4|44.8044|8.094
Grinzane Cavour|4|44.6533|7.995
Guarene|4|44.7395|8.0348
Igliano|4|44.4429|8.0133
Isasca|3S|44.5876|7.3816
La Morra|4|44.6385|7.9326
Lagnasco|3|44.6249|7.5556
Lequio Berria|4|44.6058|8.0981
Lequio Tanaro|4|44.5599|7.8821
Lesegno|4|44.4022|7.9708
Levice|4|44.5382|8.155
Limone Piemonte|3S|44.2027|7.5763
Lisio|3|44.3071|7.9787
Macra|3S|44.5002|7.1793
Magliano Alfieri|4|44.7692|8.0701
Magliano Alpi|3|44.4596|7.8053
Mango|4|44.6864|8.1502
Manta|3|44.6159|7.487
Marene|3|44.662|7.7292
Margarita|3|44.4034|7.6849
Marmora|3S|44.4392|7.1235
Marsaglia|4|44.4539|7.9812
Martiniana Po|3S|44.6272|7.3628
Melle|3S|44.562|7.3205
Moiola|3S|44.3211|7.3897
Mombarcaro|4|44.4676|8.0882
Mombasiglio|4|44.3666|7.9679
Monastero di Vasco|3|44.3308|7.8237
Monasterolo Casotto|3|44.3282|7.9432
Monasterolo di Savigliano|3|44.6863|7.6195
Monchiero|4|44.5705|7.9202
Mondovì|3|44.39|7.8205
Monesiglio|4|44.465|8.1185
Monforte d'Alba|4|44.5824|7.9696
Montà|4|44.8136|7.9572
Montaldo di Mondovì|3|44.3217|7.8671
Montaldo Roero|4|44.7687|7.9242
Montanera|3|44.4622|7.6656
Montelupo Albese|4|44.6214|8.048
Montemale di Cuneo|3S|44.4374|7.3753
Monterosso Grana|3S|44.4082|7.3229
Monteu Roero|4|44.7807|7.9312
Montezemolo|3|44.377|8.1411
Monticello d'Alba|4|44.7182|7.9482
Moretta|3|44.7638|7.5371
Morozzo|3|44.4239|7.7133
Murazzano|4|44.4746|8.0213
Murello|3|44.7521|7.6009
Narzole|4|44.5954|7.8698
Neive|4|44.7261|8.1152
Neviglie|4|44.6919|8.1168
Niella Belbo|4|44.5127|8.0793
Niella Tanaro|4|44.4131|7.923
Novello|4|44.5877|7.9271
Nucetto|4|44.3403|8.0603
Oncino|3S|44.6763|7.1904
Ormea|3S|44.1489|7.9126
Ostana|3S|44.6925|7.1883
Paesana|3S|44.6846|7.2738
Pagno|3S|44.6117|7.4257
Pamparato|3|44.277|7.9137
Paroldo|4|44.432|8.0724
Perletto|4|44.5993|8.213
Perlo|3|44.322|8.0949
Peveragno|3|44.33|7.6175
Pezzolo Valle Uzzone|4|44.5387|8.1939
Pianfei|3|44.372|7.7114
Piasco|3S|44.568|7.4578
Pietraporzio|3S|44.3438|7.0335
Piobesi d'Alba|4|44.735|7.9797
Piozzo|4|44.5157|7.8923
Pocapaglia|4|44.7152|7.8829
Polonghera|3|44.8023|7.5957
Pontechianale|3S|44.6226|7.03
Pradleves|3S|44.4183|7.2807
Prazzo|3S|44.4829|7.0554
Priero|3|44.376|8.0933
Priocca|4|44.7872|8.0616
Priola|3|44.2456|8.0224
Prunetto|4|44.4884|8.1438
Racconigi|3|44.7698|7.6789
Revello|3S|44.6549|7.3899
Rifreddo|3S|44.6507|7.3464
Rittana|3S|44.351|7.3984
Roaschia|3S|44.2701|7.456
Roascio|4|44.4171|8.0223
Robilante|3S|44.2942|7.5112
Roburent|3|44.3063|7.8922
Rocca Cigliè|4|44.4452|7.9509
Rocca de' Baldi|3|44.4236|7.7611
Roccabruna|3S|44.4745|7.3437
Roccaforte Mondovì|3|44.3179|7.7447
Roccasparvera|3S|44.3416|7.4408
Roccavione|3S|44.3146|7.4824
Rocchetta Belbo|4|44.636|8.1753
Roddi|4|44.6796|7.9754
Roddino|4|44.5738|8.0191
Rodello|4|44.6285|8.0568
Rossana|3S|44.5433|7.4338
Ruffia|3|44.7066|7.604
Sale delle Langhe|4|44.3952|8.0801
Sale San Giovanni|4|44.3999|8.0789
Saliceto|3|44.4133|8.1686
Salmour|4|44.578|7.7918
Saluzzo|3|44.6446|7.4926
Sambuco|3S|44.3363|7.0793
Sampeyre|3S|44.5797|7.1889
San Benedetto Belbo|4|44.4901|8.0578
San Damiano Macra|3S|44.4887|7.2584
San Michele Mondovì|4|44.377|7.911
Sanfrè|3|44.7494|7.8034
Sanfront|3S|44.647|7.321
Sant'Albano Stura|3|44.5089|7.7223
Santa Vittoria d'Alba|4|44.6986|7.9373
Santo Stefano Belbo|4|44.7077|8.2307
Santo Stefano Roero|4|44.7884|7.9409
Savigliano|3|44.644|7.6559
Scagnello|4|44.3333|7.9864
Scarnafigi|3|44.6788|7.5659
Serralunga d'Alba|4|44.6107|8.0006
Serravalle Langhe|4|44.5592|8.0586
Sinio|4|44.6003|8.0199
Somano|4|44.5353|8.0078
Sommariva del Bosco|3|44.7687|7.7853
Sommariva Perno|4|44.7456|7.9006
Stroppo|3S|44.5069|7.1258
Tarantasca|3|44.4937|7.5437
Torre Bormida|4|44.5627|8.1544
Torre Mondovì|3|44.3528|7.8996
Torre San Giorgio|3|44.7357|7.5281
Torresina|4|44.4336|8.0367
Treiso|4|44.6892|8.0868
Trezzo Tinella|4|44.677|8.1075
Trinità|4|44.5083|7.7579
Valdieri|3S|44.2776|7.3976
Valgrana|3S|44.4112|7.3801
Valloriate|3S|44.3381|7.3744
Venasca|3S|44.5622|7.3969
Verduno|4|44.6661|7.9307
Vernante|3S|44.245|7.5338
Verzuolo|3S|44.6029|7.4749
Vezza d'Alba|4|44.7636|7.9961
Vicoforte|3|44.3744|7.8726
Vignolo|3S|44.3622|7.4727
Villafalletto|3|44.5437|7.5401
Villanova Mondovì|3|44.3469|7.7663
Villanova Solaro|3|44.7299|7.5744
Villar San Costanzo|3S|44.4847|7.3822
Vinadio|3S|44.309|7.176
Viola|3|44.2907|7.9665
Vottignasco|3|44.5641|7.5791
@NO|Novara
Agrate Conturbia|4|45.6758|8.5598
Ameno|4|45.7887|8.4413
Armeno|4|45.8225|8.4392
Arona|4|45.7598|8.5604
Barengo|4|45.5754|8.5139
Bellinzago Novarese|4|45.5688|8.6432
Biandrate|4|45.4527|8.4624
Boca|4|45.679|8.4087
Bogogno|4|45.6673|8.5341
Bolzano Novarese|4|45.7628|8.4452
Borgo Ticino|4|45.6893|8.6018
Borgolavezzaro|4|45.3197|8.6995
Borgomanero|4|45.6989|8.4624
Briga Novarese|4|45.7319|8.4567
Briona|4|45.5425|8.4797
Caltignaga|4|45.517|8.5878
Cameri|4|45.4997|8.6605
Carpignano Sesia|4|45.5346|8.4185
Casalbeltrame|4|45.4381|8.4665
Casaleggio Novara|4|45.4888|8.4919
Casalino|4|45.1024|8.2489
Casalvolone|4|45.4002|8.4634
Castellazzo Novarese|4|45.5134|8.4869
Castelletto sopra Ticino|4|45.7122|8.643
Cavaglietto|4|45.6022|8.5021
Cavaglio d'Agogna|4|45.6132|8.4861
Cavallirio|4|45.6634|8.3945
Cerano|4|45.411|8.78
Colazza|4|45.7926|8.5003
Comignago|4|45.7149|8.564
Cressa|4|45.6471|8.5082
Cureggio|4|45.6749|8.4597
Divignano|4|45.6624|8.6016
Dormelletto|4|45.7363|8.5666
Fara Novarese|4|45.5552|8.4589
Fontaneto d'Agogna|4|45.6435|8.4808
Galliate|4|45.4783|8.6969
Garbagna Novarese|4|45.3888|8.6612
Gargallo|4|45.7288|8.4253
Gattico-Veruno|4|45.702|8.5298
Ghemme|4|45.5983|8.4209
Gozzano|4|45.7465|8.4361
Granozzo con Monticello|4|45.3711|8.5878
Grignasco|4|45.6841|8.3379
Invorio|4|45.757|8.4883
Landiona|4|45.4964|8.4231
Lesa|4|45.8296|8.5649
Maggiora|4|45.6894|8.4223
Mandello Vitta|4|45.4957|8.4598
Marano Ticino|4|45.6299|8.6316
Massino Visconti|4|45.8242|8.5409
Meina|4|45.7888|8.5388
Mezzomerico|4|45.6187|8.6055
Miasino|4|45.802|8.4297
Momo|4|45.5749|8.5561
Nebbiuno|4|45.8036|8.5271
Nibbiola|4|45.3715|8.655
Novara|4|45.5842|8.546
Oleggio|4|45.5972|8.6371
Oleggio Castello|4|45.7489|8.5271
Orta San Giulio|4|45.7981|8.407
Paruzzaro|4|45.7502|8.5176
Pella|4|45.8016|8.3848
Pettenasco|4|45.8167|8.4066
Pisano|4|45.7923|8.509
Pogno|4|45.759|8.3834
Pombia|4|45.6508|8.6323
Prato Sesia|4|45.6468|8.3729
Recetto|4|45.4604|8.4357
Romagnano Sesia|4|45.6311|8.3886
Romentino|4|45.4626|8.7208
San Maurizio d'Opaglio|4|45.7735|8.3904
San Nazzaro Sesia|4|45.4383|8.4241
San Pietro Mosezzo|4|45.4559|8.5442
Sillavengo|4|45.5207|8.441
Sizzano|4|45.5775|8.4373
Soriso|4|45.7417|8.4097
Sozzago|4|45.3986|8.7203
Suno|4|45.6334|8.5428
Terdobbiate|4|45.3766|8.6952
Tornaco|4|45.3576|8.7159
Trecate|4|45.432|8.7353
Vaprio d'Agogna|4|45.6035|8.5534
Varallo Pombia|4|45.6659|8.6327
Vespolate|4|45.3509|8.6689
Vicolungo|4|45.4776|8.4627
Vinzaglio|4|45.323|8.5191
@TO|Torino
Agliè|3|45.3671|7.7669
Airasca|3|44.917|7.4843
Ala di Stura|3S|45.3152|7.3059
Albiano d'Ivrea|3|45.433|7.9506
Almese|3S|45.1169|7.3945
Alpette|3|45.4089|7.579
Alpignano|3|45.0957|7.5254
Andezeno|4|45.0377|7.8705
Andrate|3|45.5274|7.8803
Angrogna|3S|44.8436|7.2238
Arignano|4|45.0403|7.9016
Avigliana|3S|45.0779|7.3984
Azeglio|3|45.4235|7.9939
Bairo|3|45.3866|7.7554
Balangero|3|45.2753|7.5203
Baldissero Canavese|3|45.4103|7.7442
Baldissero Torinese|3|45.0686|7.8165
Balme|3S|45.3025|7.2154
Banchette|3|45.4536|7.8563
Barbania|3|45.2913|7.6303
Bardonecchia|3|45.0783|6.7032
Barone Canavese|3|45.3255|7.8731
Beinasco|3|45.0221|7.5794
Bibiana|3S|44.7989|7.2882
Bobbio Pellice|3S|44.808|7.1168
Bollengo|3|45.4709|7.942
Borgaro Torinese|3|45.1521|7.658
Borgiallo|3|45.4171|7.6685
Borgofranco d'Ivrea|3|45.5129|7.858
Borgomasino|4|45.3633|7.9875
Borgone Susa|3S|45.1228|7.2397
Bosconero|3|45.2675|7.7666
Brandizzo|4|45.1766|7.838
Bricherasio|3S|44.8234|7.3053
Brosso|3|45.4925|7.8033
Brozolo|4|45.1174|8.0736
Bruino|3|45.0212|7.4686
Brusasco|4|45.1555|8.0601
Bruzolo|3S|45.1422|7.1956
Buriasco|3|44.8736|7.4103
Burolo|3|45.4812|7.9339
Busano|3|45.3294|7.6557
Bussoleno|3S|45.1393|7.1477
Buttigliera Alta|3|45.0688|7.4345
Cafasse|3|45.246|7.5172
Caluso|4|45.305|7.8957
Cambiano|3|44.9714|7.7787
Campiglione Fenile|3S|44.8046|7.3223
Candia Canavese|3|45.3278|7.8851
Candiolo|3|44.9592|7.6017
Canischio|3|45.374|7.5961
Cantalupa|3S|44.9459|7.3303
Cantoira|3S|45.3433|7.3801
Caprie|3S|45.1188|7.3319
Caravino|3|45.3983|7.9603
Carema|3|45.5833|7.8104
Carignano|3|44.9069|7.6732
Carmagnola|3|44.8469|7.7179
Casalborgone|4|45.1305|7.9404
Cascinette d'Ivrea|3|45.4802|7.9056
Caselette|3|45.1047|7.4808
Caselle Torinese|3|45.1775|7.6464
Castagneto Po|4|45.1593|7.8894
Castagnole Piemonte|3|44.8981|7.5661
Castellamonte|3|45.382|7.7121
Castelnuovo Nigra|3|45.4382|7.6946
Castiglione Torinese|4|45.1191|7.8071
Cavagnolo|4|45.1521|8.0515
Cavour|3S|44.7855|7.3738
Cercenasco|3|44.8613|7.5013
Ceres|3S|45.3134|7.3897
Ceresole Reale|3|45.432|7.2357
Cesana Torinese|3|44.9522|6.7908
Chialamberto|3S|45.3637|7.3415
Chianocco|3S|45.1481|7.1693
Chiaverano|3|45.4989|7.9026
Chieri|4|45.0139|7.8224
Chiesanuova|3|45.4179|7.6558
Chiomonte|3S|45.1195|6.9853
Chiusa di San Michele|3S|45.1039|7.327
Chivasso|4|45.191|7.8872
Ciconio|3|45.3299|7.7595
Cintano|3|45.4286|7.6881
Cinzano|4|45.0943|7.9256
Ciriè|3|45.2353|7.6003
Claviere|3|44.9388|6.7503
Coassolo Torinese|3S|45.2976|7.4605
Coazze|3S|45.0522|7.2979
Collegno|3|45.0775|7.5724
Colleretto Castelnuovo|3|45.4224|7.6798
Colleretto Giacosa|3|45.4319|7.7996
Condove|3S|45.1174|7.3095
Corio|3|45.3135|7.5321
Cossano Canavese|4|45.3878|7.9915
Cuceglio|3|45.3594|7.8152
Cumiana|3S|44.9797|7.3767
Cuorgnè|3|45.3897|7.6498
Druento|3|45.1347|7.5766
Exilles|3S|45.0974|6.9291
Favria|3|45.3312|7.6906
Feletto|3|45.3039|7.7447
Fenestrelle|3S|45.0361|7.0496
Fiano|3|45.2169|7.5227
Fiorano Canavese|3|45.4678|7.8337
Foglizzo|3|45.2713|7.8223
Forno Canavese|3|45.3454|7.591
Frassinetto|3|45.4371|7.6067
Front|3|45.2809|7.6636
Frossasco|3S|44.9329|7.3502
Garzigliana|3S|44.8372|7.3744
Gassino Torinese|4|45.1317|7.8276
Germagnano|3S|45.2639|7.4695
Giaglione|3S|45.1402|7.0148
Giaveno|3S|45.042|7.352
Givoletto|3|45.1622|7.4964
Gravere|3S|45.1253|7.0175
Groscavallo|3S|45.3692|7.234
Grosso|3|45.2575|7.5579
Grugliasco|3|45.068|7.5776
Ingria|3|45.4665|7.5709
Inverso Pinasca|3S|44.9456|7.2184
Isolabella|4|44.9067|7.9102
Issiglio|3|45.4469|7.7521
Ivrea|3|45.4674|7.8748
La Cassa|3|45.1803|7.5163
La Loggia|3|44.9577|7.6673
Lanzo Torinese|3|45.2734|7.4774
Lauriano|4|45.1583|7.9916
Leini|3|45.1846|7.7133
Lemie|3S|45.2282|7.292
Lessolo|3|45.4783|7.8147
Levone|3|45.3182|7.6062
Locana|3|45.4177|7.4588
Lombardore|3|45.2355|7.7403
Lombriasco|3|44.8409|7.6359
Loranzè|3|45.4417|7.8127
Luserna San Giovanni|3S|44.8154|7.2513
Lusernetta|3S|44.8031|7.2467
Lusigliè|3|45.3184|7.7667
Macello|3S|44.8511|7.398
Maglione|4|45.3467|8.0133
Mappano|3|45.1478|7.7061
Marentino|4|45.058|7.8746
Massello|3S|44.9676|7.0262
Mathi|3|45.2552|7.542
Mattie|3S|45.1181|7.1151
Mazzè|4|45.3003|7.9327
Meana di Susa|3S|45.122|7.0647
Mercenasco|3|45.3572|7.8824
Mezzenile|3S|45.2951|7.3945
Mombello di Torino|4|45.0457|7.9208
Mompantero|3S|45.142|7.0646
Monastero di Lanzo|3S|45.3019|7.4397
Moncalieri|3|45.0005|7.6848
Moncenisio|3S|45.2053|6.9825
Montaldo Torinese|4|45.0655|7.8496
Montalenghe|3|45.3375|7.8388
Montalto Dora|3|45.4908|7.8628
Montanaro|4|45.2336|7.8533
Monteu da Po|4|45.1509|8.0168
Moriondo Torinese|4|45.0376|7.94
Nichelino|3|44.9955|7.6466
Noasca|3|45.454|7.3146
Nole|3|45.244|7.5728
Nomaglio|3|45.5362|7.8603
None|3|44.9331|7.5401
Novalesa|3S|45.1896|7.0155
Oglianico|3|45.3426|7.6937
Orbassano|3|45.0073|7.5369
Orio Canavese|3|45.3293|7.8617
Osasco|3S|44.8494|7.3432
Osasio|3|44.8714|7.608
Oulx|3|45.0331|6.8325
Ozegna|3|45.3493|7.7425
Palazzo Canavese|3|45.4593|7.9789
Pancalieri|3|44.8334|7.5859
Parella|3|45.4307|7.7932
Pavarolo|4|45.0725|7.8347
Pavone Canavese|3|45.4376|7.8517
Pecetto Torinese|3|45.0169|7.7499
Perosa Argentina|3S|44.9574|7.1909
Perosa Canavese|3|45.3971|7.8308
Perrero|3S|44.9182|7.1291
Pertusio|3|45.3568|7.6385
Pessinetto|3S|45.2891|7.4042
Pianezza|3|45.1058|7.5434
Pinasca|3S|44.9426|7.2291
Pinerolo|3S|44.8873|7.3319
Pino Torinese|3|45.0395|7.7771
Piobesi Torinese|3|44.9329|7.6101
Piossasco|3|44.9906|7.4637
Piscina|3|44.9194|7.4262
Piverone|3|45.4463|8.0057
Poirino|4|44.9208|7.8469
Pomaretto|3S|44.956|7.1828
Pont Canavese|3|45.4205|7.5969
Porte|3S|44.8873|7.268
Pragelato|3S|44.9815|6.9392
Prali|3S|44.8811|7.0524
Pralormo|4|44.8597|7.9014
Pramollo|3S|44.905|7.2065
Prarostino|3S|44.8658|7.2682
Prascorsano|3|45.3678|7.6169
Pratiglione|3|45.3528|7.596
Quagliuzzo|3|45.4268|7.7816
Quassolo|3|45.5229|7.8323
Quincinetto|3|45.563|7.8073
Reano|3|45.0521|7.4304
Ribordone|3|45.432|7.5019
Riva presso Chieri|4|44.985|7.8723
Rivalba|4|45.1183|7.8881
Rivalta di Torino|3|45.034|7.5184
Rivara|3|45.3326|7.6329
Rivarolo Canavese|3|45.3312|7.7171
Rivarossa|3|45.251|7.7178
Rivoli|3|45.0697|7.5177
Robassomero|3|45.2|7.5689
Rocca Canavese|3|45.3089|7.5759
Roletto|3S|44.9247|7.3313
Romano Canavese|3|45.3887|7.8665
Ronco Canavese|3|45.4997|7.5469
Rondissone|4|45.2469|7.9631
Rorà|3S|44.7921|7.199
Rosta|3|45.0679|7.4651
Roure|3S|45.0014|7.1294
Rubiana|3S|45.1379|7.3848
Rueglio|3|45.4683|7.7546
Salassa|3|45.3585|7.6892
Salbertrand|3S|45.072|6.8832
Salerano Canavese|3|45.4581|7.8511
Salza di Pinerolo|3S|44.9346|7.0345
Samone|3|45.4506|7.8452
San Benigno Canavese|3|45.2271|7.785
San Carlo Canavese|3|45.2478|7.6108
San Colombano Belmonte|3|45.3823|7.621
San Didero|3S|45.1354|7.213
San Francesco al Campo|3|45.2265|7.6572
San Germano Chisone|3S|44.8986|7.2412
San Gillio|3|45.1427|7.5358
San Giorgio Canavese|3|45.3342|7.7968
San Giorio di Susa|3S|45.128|7.178
San Giusto Canavese|3|45.3152|7.8091
San Martino Canavese|3|45.3944|7.8166
San Maurizio Canavese|3|45.2167|7.6312
San Mauro Torinese|3|45.1044|7.762
San Pietro Val Lemina|3S|44.9065|7.3109
San Ponso|3|45.3508|7.6703
San Raffaele Cimena|4|45.1467|7.8493
San Sebastiano da Po|4|45.1676|7.9572
San Secondo di Pinerolo|3S|44.8672|7.2982
Sangano|3|45.0261|7.4481
Sant'Ambrogio di Torino|3S|45.0994|7.3623
Sant'Antonino di Susa|3S|45.107|7.2736
Santena|3|44.9491|7.7718
Sauze d'Oulx|3|45.027|6.8583
Sauze di Cesana|3|44.9407|6.859
Scalenghe|3|44.8917|7.4925
Scarmagno|3|45.3845|7.8411
Sciolze|4|45.0932|7.8804
Sestriere|3|44.9585|6.8787
Settimo Rottaro|4|45.4078|7.9935
Settimo Torinese|3|45.1373|7.771
Settimo Vittone|3|45.5498|7.8322
Sparone|3|45.4139|7.5434
Strambinello|3|45.4227|7.7684
Strambino|3|45.3815|7.8857
Susa|3S|45.1372|7.054
Tavagnasco|3|45.544|7.822
Torino|3|45.0678|7.6825
Torrazza Piemonte|4|45.2154|7.9745
Torre Canavese|3|45.3921|7.7598
Torre Pellice|3S|44.8208|7.2237
Trana|3|45.039|7.4218
Traversella|3|45.5085|7.7494
Traves|3S|45.2706|7.4289
Trofarello|3|44.9836|7.7452
Usseaux|3S|45.0489|7.0285
Usseglio|3S|45.2332|7.2177
Vaie|3S|45.1023|7.2894
Val della Torre|3S|45.1551|7.445
Val di Chy|3|45.4611|7.7928
Valchiusa|3|45.4973|7.7413
Valgioie|3S|45.0761|7.3407
Vallo Torinese|3|45.2247|7.4956
Valperga|3|45.3706|7.6569
Valprato Soana|3|45.5215|7.5494
Varisella|3|45.2099|7.4886
Vauda Canavese|3|45.28|7.6202
Venaria Reale|3|45.1348|7.6269
Venaus|3S|45.1549|7.0126
Verolengo|4|45.1901|7.9682
Verrua Savoia|4|45.1567|8.0928
Vestignè|3|45.3858|7.9548
Vialfrè|3|45.381|7.8178
Vidracco|3|45.4307|7.7574
Vigone|3|44.8431|7.4944
Villafranca Piemonte|3|44.7789|7.5004
Villanova Canavese|3|45.2426|7.5545
Villar Dora|3S|45.1146|7.3835
Villar Focchiardo|3S|45.1114|7.2247
Villar Pellice|3S|44.8079|7.1576
Villar Perosa|3S|44.9191|7.2503
Villarbasse|3|45.0451|7.4684
Villareggia|4|45.3101|7.9766
Villastellone|3|44.9186|7.7443
Vinovo|3|44.9484|7.6339
Virle Piemonte|3|44.8645|7.5701
Vische|4|45.3356|7.9448
Vistrorio|3|45.4423|7.7681
Viù|3S|45.2392|7.3758
Volpiano|3|45.2015|7.7782
Volvera|3|44.9565|7.5111
@VB|Verbano-Cusio-Ossola
Antrona Schieranco|3|46.0569|8.0965
Anzola d'Ossola|4|45.989|8.3445
Arizzano|4|45.9574|8.5829
Arola|4|45.8084|8.3575
Aurano|4|45.9991|8.5883
Baceno|3S|46.2609|8.3202
Bannio Anzino|3|45.96|8.1551
Baveno|4|45.9089|8.505
Bee|4|45.9633|8.5759
Belgirate|4|45.8389|8.5714
Beura-Cardezza|3|46.0796|8.2997
Bognanco|3|46.1264|8.2011
Borgomezzavalle|3|46.0473|8.1994
Brovello-Carpugnino|4|45.8518|8.5396
Calasca-Castiglione|3|45.9917|8.1934
Cambiasca|4|45.9624|8.5446
Cannero Riviera|4|46.0213|8.6814
Cannobio|4|46.0618|8.6976
Caprezzo|4|45.982|8.5628
Casale Corte Cerro|4|45.9158|8.4137
Ceppo Morelli|3|45.9718|8.0677
Cesara|4|45.8345|8.3664
Cossogno|4|45.9641|8.5096
Craveggia|3|46.1404|8.4894
Crevoladossola|3|46.1486|8.2974
Crodo|3S|46.2233|8.3239
Domodossola|3|46.1152|8.292
Druogno|3|46.1345|8.4363
Formazza|3|46.3745|8.421
Germagno|4|45.8923|8.3883
Ghiffa|4|45.9591|8.6198
Gignese|4|45.8608|8.5097
Gravellona Toce|4|45.9302|8.4312
Gurro|4|46.0857|8.5706
Intragna|4|45.9942|8.5729
Loreglia|4|45.9066|8.3712
Macugnaga|3|45.9699|7.966
Madonna del Sasso|4|45.788|8.3469
Malesco|4|46.1266|8.5009
Masera|3|46.14|8.3234
Massiola|4|45.9124|8.3201
Mergozzo|4|45.9613|8.4495
Miazzina|4|45.9764|8.5222
Montecrestese|3|46.1628|8.3298
Montescheno|3|46.0679|8.2252
Nonio|4|45.8458|8.3775
Oggebbio|4|45.9977|8.6504
Omegna|4|45.8798|8.408
Ornavasso|4|45.9621|8.3936
Pallanzeno|3|46.042|8.2581
Piedimulera|3|46.0242|8.2593
Pieve Vergonte|4|46.013|8.2608
Premeno|4|45.9781|8.5961
Premia|3|46.2681|8.339
Premosello-Chiovenda|4|46.004|8.3276
Quarna Sopra|4|45.8714|8.3748
Quarna Sotto|4|45.8685|8.3648
Re|4|46.1299|8.5442
San Bernardino Verbano|4|45.9952|8.4561
Santa Maria Maggiore|3|46.135|8.4673
Stresa|4|45.8837|8.539
Toceno|3|46.1441|8.4684
Trarego Viggiona|4|46.0387|8.6461
Trasquera|3S|46.2134|8.2127
Trontano|3|46.1225|8.3332
Valle Cannobina|4|46.103|8.5997
Valstrona|4|45.923|8.2563
Vanzone con San Carlo|3|45.9832|8.1103
Varzo|3S|46.2067|8.2524
Verbania|4|45.9377|8.5265
Vignone|4|45.9598|8.5666
Villadossola|3|46.0667|8.2607
Villette|4|46.1322|8.5353
Vogogna|4|46.009|8.293
@VC|Vercelli
Alagna Valsesia|3|45.8512|7.9372
Albano Vercellese|4|45.4253|8.381
Alice Castello|4|45.3652|8.0729
Alto Sermenza|4|45.8727|8.0382
Arborio|4|45.495|8.3853
Asigliano Vercellese|4|45.2616|8.4085
Balmuccia|4|45.8188|8.1381
Balocco|4|45.4553|8.2801
Bianzè|4|45.3085|8.1225
Boccioleto|4|45.8302|8.1129
Borgo d'Ale|4|45.3494|8.0531
Borgo Vercelli|4|45.3579|8.463
Borgosesia|4|45.7167|8.2769
Buronzo|4|45.4809|8.2671
Campertogno|4|45.799|8.0322
Carcoforo|4|45.9087|8.0495
Caresana|4|45.2213|8.5069
Caresanablot|4|45.3576|8.3888
Carisio|4|45.4094|8.199
Casanova Elvo|4|45.401|8.2935
Cellio con Breia|4|45.7606|8.3093
Cervatto|4|45.883|8.1623
Cigliano|4|45.3084|8.021
Civiasco|4|45.8082|8.2941
Collobiano|4|45.3967|8.3483
Costanzana|4|45.2382|8.3681
Cravagliana|4|45.8484|8.2027
Crescentino|4|45.1905|8.0999
Crova|4|45.3307|8.2108
Desana|4|45.2688|8.3567
Fobello|4|45.8894|8.1587
Fontanetto Po|4|45.1935|8.1919
Formigliana|4|45.4293|8.2919
Gattinara|4|45.6142|8.3711
Ghislarengo|4|45.5288|8.3861
Greggio|4|45.4507|8.383
Guardabosone|4|45.7019|8.2493
Lamporo|4|45.2319|8.1016
Lenta|4|45.5575|8.3841
Lignana|4|45.2855|8.3461
Livorno Ferraris|4|45.2819|8.0805
Lozzolo|4|45.6256|8.3218
Mollia|4|45.8167|8.0303
Moncrivello|4|45.3324|7.9955
Motta de' Conti|4|45.1933|8.5209
Olcenengo|4|45.3635|8.3098
Oldenico|4|45.4028|8.3803
Palazzolo Vercellese|4|45.1863|8.2326
Pertengo|4|45.2364|8.4174
Pezzana|4|45.262|8.4823
Pila|4|45.7699|8.0811
Piode|4|45.7708|8.0511
Postua|4|45.7136|8.2306
Prarolo|4|45.2823|8.4781
Quarona|4|45.7579|8.2657
Quinto Vercellese|4|45.3797|8.3617
Rassa|4|45.7685|8.0131
Rimella|4|45.9076|8.1825
Rive|4|45.2129|8.4177
Roasio|4|45.608|8.288
Ronsecco|4|45.2531|8.2778
Rossa|4|45.8335|8.1255
Rovasenda|4|45.5388|8.3175
Salasco|4|45.3256|8.2642
Sali Vercellese|4|45.3099|8.3289
Saluggia|4|45.2376|8.011
San Germano Vercellese|4|45.35|8.2488
San Giacomo Vercellese|4|45.4979|8.3261
Santhià|4|45.3663|8.1726
Scopa|4|45.7927|8.1134
Scopello|4|45.7728|8.0941
Serravalle Sesia|4|45.6856|8.3109
Stroppiana|4|45.2302|8.4537
Tricerro|4|45.2358|8.3253
Trino|4|45.1939|8.297
Tronzano Vercellese|4|45.3413|8.173
Valduggia|4|45.7284|8.3299
Varallo|4|45.8137|8.2592
Vercelli|4|45.5554|8.3463
Villarboit|4|45.4374|8.3373
Villata|4|45.3878|8.4326
Vocca|4|45.8326|8.1946
#Puglia
@BA|Bari
Acquaviva delle Fonti|3|40.8978|16.8425
Adelfia|3|41.0043|16.8717
Alberobello|4|40.7841|17.2377
Altamura|3|40.8286|16.5527
Bari|3|41.1258|16.862
Binetto|3|41.0242|16.7096
Bitetto|3|41.0414|16.7487
Bitonto|3|41.1085|16.6915
Bitritto|3|41.0445|16.8252
Capurso|3|41.0503|16.9167
Casamassima|3|40.9571|16.9204
Cassano delle Murge|3|40.891|16.7686
Castellana Grotte|4|40.8864|17.1655
Cellamare|3|41.0193|16.9283
Conversano|4|40.9684|17.1138
Corato|3|41.1528|16.4115
Gioia del Colle|3|40.7967|16.9236
Giovinazzo|3|41.1875|16.6717
Gravina in Puglia|3|40.8197|16.4228
Grumo Appula|3|41.0135|16.7085
Locorotondo|4|40.7892|17.2993
Modugno|3|41.0826|16.7806
Mola di Bari|4|41.0613|17.0917
Molfetta|3|41.1992|16.5968
Monopoli|4|40.9522|17.2999
Noci|3|40.7947|17.1236
Noicattaro|3|41.0323|16.9877
Palo del Colle|3|41.0575|16.7008
Poggiorsini|3|40.9171|16.2548
Polignano a Mare|4|40.9961|17.2196
Putignano|3|40.8518|17.1213
Rutigliano|3|41.0112|17.0055
Ruvo di Puglia|3|41.1141|16.4864
Sammichele di Bari|3|40.888|16.9495
Sannicandro di Bari|3|41.0005|16.7977
Santeramo in Colle|3|40.793|16.7553
Terlizzi|3|41.1302|16.5425
Toritto|3|40.9982|16.6798
Triggiano|3|41.0634|16.9217
Turi|3|40.9173|17.0212
Valenzano|3|41.0453|16.8851
@BT|Barletta-Andria-Trani
Andria|3|41.2276|16.2954
Barletta|2|41.3215|16.2869
Bisceglie|3|41.2403|16.501
Canosa di Puglia|2|41.2196|16.0675
Margherita di Savoia|2|41.3742|16.1502
Minervino Murge|2|41.0851|16.0778
San Ferdinando di Puglia|2|41.3026|16.0705
Spinazzola|2|40.9692|16.088
Trani|3|41.2751|16.4163
Trinitapoli|2|41.3589|16.0874
@BR|Brindisi
Brindisi|4|40.6362|17.6885
Carovigno|4|40.7072|17.6568
Ceglie Messapica|4|40.646|17.5171
Cellino San Marco|4|40.4722|17.9663
Cisternino|4|40.743|17.4257
Erchie|4|40.436|17.7346
Fasano|4|40.8344|17.3584
Francavilla Fontana|4|40.5302|17.5827
Latiano|4|40.5538|17.7182
Mesagne|4|40.5588|17.8083
Oria|4|40.4973|17.6413
Ostuni|4|40.7276|17.5764
San Donaci|4|40.4494|17.9226
San Michele Salentino|4|40.6304|17.6336
San Pancrazio Salentino|4|40.4191|17.8394
San Pietro Vernotico|4|40.4915|17.9989
San Vito dei Normanni|4|40.6562|17.7038
Torchiarolo|4|40.484|18.0516
Torre Santa Susanna|4|40.4656|17.7356
Villa Castelli|4|40.5845|17.4746
@FG|Foggia
Accadia|1|41.1588|15.3315
Alberona|2|41.4327|15.123
Anzano di Puglia|1|41.1225|15.2844
Apricena|2|41.7839|15.4437
Ascoli Satriano|1|41.2061|15.5616
Biccari|2|41.3961|15.1944
Bovino|1|41.2499|15.3412
Cagnano Varano|2|41.8287|15.7732
Candela|1|41.1379|15.5147
Carapelle|2|41.3653|15.6937
Carlantino|2|41.5921|14.9768
Carpino|2|41.8442|15.8562
Casalnuovo Monterotaro|2|41.6202|15.1038
Casalvecchio di Puglia|2|41.5938|15.1105
Castelluccio dei Sauri|2|41.3039|15.4792
Castelluccio Valmaggiore|2|41.3423|15.199
Castelnuovo della Daunia|2|41.5826|15.1208
Celenza Valfortore|2|41.5617|14.9788
Celle di San Vito|2|41.3259|15.181
Cerignola|2|41.2648|15.8997
Chieuti|2|41.8446|15.1659
Deliceto|1|41.223|15.3858
Faeto|2|41.3254|15.1598
Foggia|2|41.5028|15.4529
Ischitella|2|41.9043|15.8995
Isole Tremiti|2|42.1148|15.4871
Lesina|2|41.8594|15.3527
Lucera|2|41.5083|15.3376
Manfredonia|2|41.6255|15.9096
Mattinata|2|41.7101|16.0516
Monte Sant'Angelo|2|41.7054|15.9677
Monteleone di Puglia|1|41.1654|15.258
Motta Montecorvino|2|41.5074|15.1141
Ordona|2|41.3155|15.6274
Orsara di Puglia|2|41.2816|15.2644
Orta Nova|2|41.3299|15.7107
Panni|1|41.222|15.2746
Peschici|2|41.9474|16.0139
Pietramontecorvino|2|41.5416|15.1275
Poggio Imperiale|2|41.8233|15.3654
Rignano Garganico|2|41.677|15.5875
Rocchetta Sant'Antonio|1|41.1035|15.4618
Rodi Garganico|2|41.9287|15.8811
Roseto Valfortore|2|41.3724|15.0961
San Giovanni Rotondo|2|41.7051|15.7306
San Marco in Lamis|2|41.7131|15.6398
San Marco la Catola|2|41.5248|15.0059
San Nicandro Garganico|2|41.8384|15.5653
San Paolo di Civitate|2|41.7383|15.2602
San Severo|2|41.6898|15.3776
Sant'Agata di Puglia|1|41.1518|15.3803
Serracapriola|2|41.8119|15.1602
Stornara|2|41.2886|15.7681
Stornarella|2|41.2564|15.7298
Torremaggiore|2|41.6875|15.293
Troia|2|41.3631|15.3123
Vico del Gargano|2|41.8983|15.9576
Vieste|2|41.8828|16.1792
Volturara Appula|2|41.496|15.0522
Volturino|2|41.4772|15.1242
Zapponeta|2|41.457|15.9565
@LE|Lecce
Alessano|4|39.8897|18.3312
Alezio|4|40.0613|18.0582
Alliste|4|39.9486|18.0888
Andrano|4|39.983|18.3822
Aradeo|4|40.1309|18.1296
Arnesano|4|40.3352|18.0916
Bagnolo del Salento|4|40.1506|18.3526
Botrugno|4|40.0647|18.3244
Calimera|4|40.25|18.2807
Campi Salentina|4|40.3985|18.0183
Cannole|4|40.1662|18.366
Caprarica di Lecce|4|40.2581|18.249
Carmiano|4|40.3448|18.043
Carpignano Salentino|4|40.1978|18.3408
Casarano|4|40.0108|18.1618
Castri di Lecce|4|40.2738|18.2633
Castrignano de' Greci|4|40.1739|18.297
Castrignano del Capo|4|39.8323|18.3512
Castro|4|40.007|18.4257
Cavallino|4|40.3125|18.2004
Collepasso|4|40.073|18.1631
Copertino|4|40.2717|18.0503
Corigliano d'Otranto|4|40.1596|18.2594
Corsano|4|39.8892|18.3693
Cursi|4|40.1496|18.3148
Cutrofiano|4|40.1263|18.2016
Diso|4|40.0095|18.3925
Gagliano del Capo|4|39.8442|18.3695
Galatina|4|40.1743|18.1678
Galatone|4|40.1429|18.0704
Gallipoli|4|40.0567|17.9964
Giuggianello|4|40.0944|18.3689
Giurdignano|4|40.1215|18.4327
Guagnano|4|40.4012|17.949
Lecce|4|40.1522|18.2261
Lequile|4|40.3058|18.1402
Leverano|4|40.2894|17.9994
Lizzanello|4|40.3041|18.2225
Maglie|4|40.1185|18.2989
Martano|4|40.2036|18.302
Martignano|4|40.2374|18.2552
Matino|4|40.0325|18.1339
Melendugno|4|40.2717|18.3369
Melissano|4|39.9711|18.1258
Melpignano|4|40.1571|18.2931
Miggiano|4|39.9597|18.3116
Minervino di Lecce|4|40.0884|18.4204
Monteroni di Lecce|4|40.3244|18.0976
Montesano Salentino|4|39.9756|18.3214
Morciano di Leuca|4|39.8478|18.3124
Muro Leccese|4|40.1023|18.3381
Nardò|4|40.1763|18.0306
Neviano|4|40.1077|18.114
Nociglia|4|40.0392|18.326
Novoli|4|40.3785|18.0492
Ortelle|4|40.0339|18.3911
Otranto|4|40.1478|18.4859
Palmariggi|4|40.1313|18.3812
Parabita|4|40.0519|18.1295
Patù|4|39.8412|18.3389
Poggiardo|4|40.0542|18.3791
Porto Cesareo|4|40.2628|17.8984
Presicce-Acquarica|4|39.9032|18.2548
Racale|4|39.9631|18.0938
Ruffano|4|39.9841|18.2475
Salice Salentino|4|40.3857|17.9637
Salve|4|39.8613|18.2933
San Cassiano|4|40.0563|18.3339
San Cesario di Lecce|4|40.303|18.1599
San Donato di Lecce|4|40.2681|18.1842
San Pietro in Lama|4|40.3084|18.1286
Sanarica|4|40.0891|18.3487
Sannicola|4|40.0919|18.0661
Santa Cesarea Terme|4|40.0363|18.4568
Scorrano|4|40.0916|18.2996
Seclì|4|40.1301|18.1005
Sogliano Cavour|4|40.1488|18.1952
Soleto|4|40.1877|18.2074
Specchia|4|39.9371|18.2976
Spongano|4|40.0178|18.3656
Squinzano|4|40.4365|18.0418
Sternatia|4|40.2221|18.2252
Supersano|4|40.0177|18.2432
Surano|4|40.0283|18.3451
Surbo|4|40.396|18.1334
Taurisano|4|39.9566|18.2141
Taviano|4|39.9835|18.0868
Tiggiano|4|39.9058|18.3644
Trepuzzi|4|40.4055|18.0706
Tricase|4|39.9304|18.3553
Tuglie|4|40.0738|18.0981
Ugento|4|39.9263|18.1574
Uggiano la Chiesa|4|40.1017|18.4493
Veglie|4|40.3351|17.9652
Vernole|4|40.2895|18.3035
Zollino|4|40.206|18.2506
@TA|Taranto
Avetrana|4|40.3499|17.7274
Carosino|4|40.4658|17.3976
Castellaneta|3|40.6304|16.9347
Crispiano|3|40.6055|17.2321
Faggiano|4|40.4198|17.3866
Fragagnano|4|40.4319|17.4722
Ginosa|3|40.5798|16.7562
Grottaglie|4|40.5362|17.4342
Laterza|3|40.6295|16.7997
Leporano|4|40.3839|17.3349
Lizzano|4|40.391|17.4476
Manduria|4|40.4018|17.6335
Martina Franca|4|40.7042|17.34
Maruggio|4|40.3223|17.5724
Massafra|3|40.5888|17.117
Monteiasi|4|40.4997|17.381
Montemesola|4|40.563|17.3392
Monteparano|4|40.444|17.4151
Mottola|3|40.6332|17.0372
Palagianello|3|40.6119|16.9751
Palagiano|3|40.5782|17.0374
Pulsano|4|40.3847|17.3557
Roccaforzata|4|40.4374|17.3896
San Giorgio Ionico|4|40.4566|17.3787
San Marzano di San Giuseppe|4|40.4544|17.5056
Sava|4|40.4034|17.5584
Statte|3|40.5632|17.2098
Taranto|3|40.5488|17.0806
Torricella|4|40.3541|17.4994
#Sardegna
@CA|Cagliari
Assemini|4|39.2915|9.0015
Cagliari|4|39.217|9.1129
Capoterra|4|39.1753|8.9719
Decimomannu|4|39.3117|8.9688
Elmas|4|39.2681|9.0496
Maracalagonis|4|39.2853|9.2294
Monserrato|4|39.2595|9.1459
Pula|4|39.0074|9.0016
Quartu Sant'Elena|4|39.24|9.1881
Quartucciu|4|39.2541|9.1788
Sarroch|4|39.0672|9.0094
Selargius|4|39.257|9.1676
Sestu|4|39.2942|9.093
Settimo San Pietro|4|39.2917|9.1851
Sinnai|4|39.3042|9.2035
Uta|4|39.291|8.9543
Villa San Pietro|4|39.034|8.9955
@NU|Nuoro
Aritzo|4|39.9568|9.1966
Arzana|4|39.9195|9.527
Atzara|4|39.9923|9.0757
Austis|4|40.0707|9.0879
Bari Sardo|4|39.8421|9.6441
Baunei|4|40.0324|9.6634
Belvì|4|39.9626|9.1852
Birori|4|40.2649|8.8175
Bitti|4|40.479|9.384
Bolotana|4|40.3258|8.9611
Borore|4|40.2169|8.8037
Bortigali|4|40.2829|8.8362
Cardedu|4|39.7972|9.6247
Desulo|4|40.0108|9.2283
Dorgali|4|40.2928|9.5888
Dualchi|4|40.2289|8.8964
Elini|4|39.8999|9.5313
Fonni|4|40.1188|9.252
Gadoni|4|39.9135|9.1858
Gairo|4|39.8471|9.5072
Galtellì|4|40.3866|9.6143
Gavoi|4|40.1618|9.1951
Girasole|4|39.9517|9.662
Ilbono|4|39.8927|9.5489
Irgoli|4|40.4088|9.6301
Jerzu|4|39.7912|9.5184
Lanusei|4|39.8786|9.5411
Lei|4|40.3044|8.918
Loceri|4|39.8566|9.5822
Loculi|4|40.4073|9.6112
Lodè|4|40.5914|9.5398
Lodine|4|40.1481|9.2183
Lotzorai|4|39.9692|9.6637
Lula|4|40.4704|9.4864
Macomer|4|40.2652|8.7814
Mamoiada|4|40.2157|9.2804
Meana Sardo|4|39.9443|9.0723
Noragugume|4|40.2246|8.9207
Nuoro|4|40.1277|9.3423
Oliena|4|40.2723|9.403
Ollolai|4|40.1685|9.1785
Olzai|4|40.1829|9.1483
Onanì|4|40.4853|9.4412
Onifai|4|40.407|9.6513
Oniferi|4|40.272|9.1703
Orani|4|40.2483|9.1828
Orgosolo|4|40.2048|9.3549
Orosei|4|40.3792|9.695
Orotelli|4|40.3058|9.1128
Ortueri|4|40.0356|8.9872
Orune|4|40.4076|9.3697
Osidda|4|40.5239|9.2193
Osini|4|39.8228|9.4962
Ottana|4|40.2335|9.0446
Ovodda|4|40.0957|9.1623
Perdasdefogu|4|39.6792|9.44
Posada|4|40.632|9.7164
Sarule|4|40.2291|9.1673
Silanus|4|40.2889|8.8905
Sindia|4|40.2962|8.6563
Siniscola|4|40.5719|9.6922
Sorgono|4|40.026|9.102
Talana|4|40.0421|9.4965
Tertenia|4|39.6968|9.5777
Teti|4|40.0958|9.1181
Tiana|4|40.0685|9.1473
Tonara|4|40.0251|9.1731
Torpè|4|40.628|9.6773
Tortolì|4|39.9266|9.6592
Triei|4|40.0371|9.6405
Ulassai|4|39.8106|9.499
Urzulei|4|40.0933|9.508
Ussassai|4|39.8108|9.3948
Villagrande Strisaili|4|39.9614|9.5073
@OR|Oristano
Abbasanta|4|40.1268|8.818
Aidomaggiore|4|40.1708|8.8565
Albagiara|4|39.7876|8.862
Ales|4|39.7682|8.8156
Allai|4|39.9572|8.8631
Arborea|4|39.7738|8.5818
Ardauli|4|40.0847|8.9115
Assolo|4|39.8099|8.9182
Asuni|4|39.8724|8.9464
Baradili|4|39.7213|8.8974
Baratili San Pietro|4|39.9928|8.5558
Baressa|4|39.7127|8.8753
Bauladu|4|40.0205|8.6719
Bidonì|4|40.1131|8.9364
Bonarcado|4|40.0958|8.6571
Boroneddu|4|40.1131|8.871
Bosa|4|40.297|8.4986
Busachi|4|40.0327|8.8967
Cabras|4|39.9303|8.5321
Cuglieri|4|40.1885|8.5674
Curcuris|4|39.7461|8.8306
Flussio|4|40.2675|8.5402
Fordongianus|4|39.9945|8.8098
Ghilarza|4|40.1197|8.8349
Gonnoscodina|4|39.7|8.8355
Gonnosnò|4|39.7612|8.8723
Gonnostramatza|4|39.6812|8.8338
Laconi|4|39.8526|9.0504
Magomadas|4|40.2648|8.5227
Marrubiu|4|39.7521|8.6372
Masullas|4|39.6996|8.7827
Milis|4|40.0504|8.637
Modolo|4|40.275|8.5292
Mogorella|4|39.8646|8.8579
Mogoro|4|39.6847|8.7771
Montresta|4|40.3737|8.4996
Morgongiori|4|39.7466|8.7701
Narbolia|4|40.0476|8.5752
Neoneli|4|40.0648|8.9467
Norbello|4|40.1348|8.832
Nughedu Santa Vittoria|4|40.1021|8.9535
Nurachi|4|39.9734|8.5402
Nureci|4|39.8233|8.9738
Ollastra|4|39.9509|8.7342
Oristano|4|40.0266|8.6796
Palmas Arborea|4|39.8766|8.6431
Pau|4|39.7915|8.8023
Paulilatino|4|40.084|8.7639
Pompu|4|39.7245|8.7954
Riola Sardo|4|39.9941|8.5387
Ruinas|4|39.9071|8.8976
Sagama|4|40.2616|8.5775
Samugheo|4|39.9462|8.9405
San Nicolò d'Arcidano|4|39.6834|8.6469
San Vero Milis|4|40.0145|8.5982
Santa Giusta|4|39.8782|8.61
Santu Lussurgiu|4|40.1417|8.651
Scano di Montiferro|4|40.2163|8.5841
Sedilo|4|40.1732|8.9191
Seneghe|4|40.0822|8.6157
Senis|4|39.8241|8.94
Sennariolo|4|40.2127|8.5552
Siamaggiore|4|39.9501|8.636
Siamanna|4|39.9207|8.761
Siapiccia|4|39.9279|8.7621
Simala|4|39.7216|8.8267
Simaxis|4|39.9303|8.6921
Sini|4|39.7541|8.9043
Siris|4|39.7126|8.7748
Soddì|4|40.1305|8.8784
Solarussa|4|39.9557|8.6715
Sorradile|4|40.1065|8.933
Suni|4|40.2809|8.5494
Tadasuni|4|40.1105|8.8837
Terralba|4|39.7203|8.6361
Tinnura|4|40.2691|8.5482
Tramatza|4|40.0037|8.6495
Tresnuraghes|4|40.2521|8.52
Ulà Tirso|4|40.046|8.904
Uras|4|39.7006|8.7
Usellus|4|39.8096|8.8507
Villa Sant'Antonio|4|39.8591|8.9015
Villa Verde|4|39.7952|8.8211
Villanova Truschedu|4|39.9886|8.752
Villaurbana|4|39.8856|8.7774
Zeddiani|4|39.9899|8.5953
Zerfaliu|4|39.9588|8.7086
@SS|Sassari
Aggius|4|40.9293|9.0652
Aglientu|4|41.0796|9.1127
Alà dei Sardi|4|40.6501|9.3278
Alghero|4|40.56|8.3151
Anela|4|40.4418|9.0574
Ardara|4|40.6218|8.8103
Arzachena|4|41.0799|9.3876
Badesi|4|40.9651|8.8842
Banari|4|40.5729|8.6974
Benetutti|4|40.4565|9.1688
Berchidda|4|40.7841|9.1645
Bessude|4|40.5539|8.73
Bonnanaro|4|40.5334|8.7644
Bono|4|40.4168|9.03
Bonorva|4|40.4188|8.7681
Bortigiadas|4|40.8914|9.0431
Borutta|4|40.5224|8.7435
Bottidda|4|40.3915|9.0085
Buddusò|4|40.5781|9.2581
Budoni|4|40.7076|9.6995
Bultei|4|40.4562|9.0644
Bulzi|4|40.8474|8.83
Burgos|4|40.39|8.9953
Calangianus|4|40.9198|9.1948
Cargeghe|4|40.6695|8.6145
Castelsardo|4|40.9105|8.7183
Cheremule|4|40.5064|8.7253
Chiaramonti|4|40.7491|8.8186
Codrongianos|4|40.6573|8.6798
Cossoine|4|40.431|8.715
Erula|4|40.7912|8.9422
Esporlatu|4|40.3866|8.9897
Florinas|4|40.6496|8.6651
Giave|4|40.452|8.7522
Golfo Aranci|4|41.0065|9.6145
Illorai|4|40.3539|9.001
Ittireddu|4|40.544|8.9023
Ittiri|4|40.593|8.5684
La Maddalena|4|41.2128|9.4067
Laerru|4|40.8171|8.8354
Loiri Porto San Paolo|4|40.8763|9.6295
Luogosanto|4|41.0547|9.2041
Luras|4|40.9349|9.1754
Mara|4|40.4096|8.6388
Martis|4|40.7787|8.8081
Monteleone Rocca Doria|4|40.4716|8.5603
Monti|4|40.806|9.3255
Mores|4|40.5484|8.8312
Muros|4|40.6781|8.6173
Nughedu San Nicolò|4|40.5565|9.0215
Nule|4|40.4616|9.1898
Nulvi|4|40.7838|8.7437
Olbia|4|40.9233|9.5027
Olmedo|4|40.6516|8.3802
Oschiri|4|40.7198|9.101
Osilo|4|40.7441|8.6711
Ossi|4|40.6749|8.5917
Ozieri|4|40.5859|9.001
Padria|4|40.3964|8.6299
Padru|4|40.7658|9.5202
Palau|4|41.1811|9.382
Pattada|4|40.5818|9.1129
Perfugas|4|40.8334|8.8828
Ploaghe|4|40.6643|8.7418
Porto Torres|4|40.8344|8.4031
Pozzomaggiore|4|40.3988|8.6602
Putifigari|4|40.5623|8.4611
Romana|4|40.4841|8.5874
San Teodoro|4|40.7705|9.6739
Sant'Antonio di Gallura|4|40.9918|9.301
Santa Maria Coghinas|4|40.9043|8.8686
Santa Teresa Gallura|4|41.2414|9.1885
Sassari|4|40.7778|8.922
Sedini|4|40.8523|8.8157
Semestene|4|40.3985|8.7254
Sennori|4|40.7894|8.5917
Siligo|4|40.5765|8.7273
Sorso|4|40.7966|8.5778
Stintino|4|40.9392|8.2255
Telti|4|40.8764|9.3528
Tempio Pausania|4|40.8974|9.1035
Tergu|4|40.8675|8.7167
Thiesi|4|40.5249|8.7164
Tissi|4|40.6777|8.5627
Torralba|4|40.513|8.7653
Trinità d'Agultu e Vignola|4|40.9838|8.9156
Tula|4|40.7325|8.9839
Uri|4|40.6395|8.4854
Usini|4|40.6641|8.5405
Valledoria|4|40.9283|8.8246
Viddalba|4|40.9168|8.8944
Villanova Monteleone|4|40.5037|8.4708
@SU|Sud Sardegna
Arbus|4|39.5258|8.5978
Armungia|4|39.5217|9.3818
Ballao|4|39.5497|9.3615
Barrali|4|39.4753|9.1013
Barumini|4|39.7015|9.0027
Buggerru|4|39.3974|8.4022
Burcei|4|39.3426|9.3595
Calasetta|4|39.1108|8.3683
Carbonia|4|39.1653|8.5278
Carloforte|4|39.1427|8.3027
Castiadas|4|39.2363|9.501
Collinas|4|39.6406|8.8399
Decimoputzu|4|39.3352|8.9152
Dolianova|4|39.3782|9.1786
Domus de Maria|4|38.944|8.8635
Domusnovas|4|39.3247|8.6487
Donori|4|39.4318|9.1272
Escalaplano|4|39.6266|9.3571
Escolca|4|39.6984|9.1215
Esterzili|4|39.7791|9.2847
Fluminimaggiore|4|39.4392|8.4979
Furtei|4|39.5624|8.9447
Genoni|4|39.7946|9.008
Genuri|4|39.7442|8.9233
Gergei|4|39.6996|9.1004
Gesico|4|39.6163|9.1065
Gesturi|4|39.74|9.024
Giba|4|39.0718|8.6356
Goni|4|39.5781|9.2859
Gonnesa|4|39.2666|8.4717
Gonnosfanadiga|4|39.4959|8.6624
Guamaggiore|4|39.5686|9.074
Guasila|4|39.5618|9.0454
Guspini|4|39.5413|8.6331
Iglesias|4|39.3125|8.5341
Isili|4|39.7404|9.1086
Las Plassas|4|39.6801|8.9849
Lunamatrona|4|39.6505|8.8993
Mandas|4|39.6563|9.1298
Masainas|4|39.0516|8.6306
Monastir|4|39.3847|9.0448
Muravera|4|39.4209|9.5736
Musei|4|39.3023|8.6674
Narcao|4|39.1682|8.6747
Nuragus|4|39.7762|9.0381
Nurallao|4|39.7903|9.0807
Nuraminis|4|39.4429|9.0147
Nurri|4|39.712|9.2298
Nuxis|4|39.1529|8.7381
Orroli|4|39.6935|9.2503
Ortacesus|4|39.5391|9.0835
Pabillonis|4|39.5912|8.721
Pauli Arbarei|4|39.6607|8.922
Perdaxius|4|39.161|8.6114
Pimentel|4|39.4855|9.0655
Piscinas|4|39.0744|8.6659
Portoscuso|4|39.207|8.3809
Sadali|4|39.8132|9.2719
Samassi|4|39.4813|8.9076
Samatzai|4|39.4832|9.0346
San Basilio|4|39.5371|9.1982
San Gavino Monreale|4|39.5509|8.7919
San Giovanni Suergiu|4|39.1104|8.522
San Nicolò Gerrei|4|39.4974|9.3071
San Sperate|4|39.3587|9.0067
San Vito|4|39.4432|9.5408
Sanluri|4|39.5626|8.8986
Sant'Andrea Frius|4|39.4779|9.1703
Sant'Anna Arresi|4|39.0018|8.6463
Sant'Antioco|4|39.0648|8.4563
Santadi|4|39.0918|8.7164
Sardara|4|39.6164|8.8206
Segariu|4|39.5644|8.9816
Selegas|4|39.5678|9.1041
Senorbì|4|39.535|9.1301
Serdiana|4|39.3742|9.1589
Serramanna|4|39.424|8.9231
Serrenti|4|39.4928|8.9752
Serri|4|39.7017|9.1441
Setzu|4|39.7229|8.9392
Seui|4|39.8406|9.3212
Seulo|4|39.8704|9.2357
Siddi|4|39.6722|8.8884
Siliqua|4|39.3002|8.8087
Silius|4|39.5167|9.2935
Siurgus Donigala|4|39.6003|9.189
Soleminis|4|39.348|9.1817
Suelli|4|39.5627|9.1321
Teulada|4|38.9674|8.7722
Tratalias|4|39.1035|8.579
Tuili|4|39.714|8.9603
Turri|4|39.7048|8.9165
Ussana|4|39.3946|9.0732
Ussaramanna|4|39.6928|8.9076
Vallermosa|4|39.3644|8.7963
Villacidro|4|39.457|8.7367
Villamar|4|39.618|8.9588
Villamassargia|4|39.2759|8.6405
Villanova Tulo|4|39.7803|9.2132
Villanovaforru|4|39.6318|8.869
Villanovafranca|4|39.6452|9.0014
Villaperuccio|4|39.1118|8.67
Villaputzu|4|39.441|9.574
Villasalto|4|39.4921|9.393
Villasimius|4|39.1431|9.5209
Villasor|4|39.3804|8.9428
Villaspeciosa|4|39.3122|8.9251
#Sicilia
@AG|Agrigento
Agrigento|2|37.3123|13.5747
Alessandria della Rocca|2|37.57|13.4546
Aragona|2|37.4032|13.6179
Bivona|2|37.6174|13.4398
Burgio|2|37.5994|13.2902
Calamonaci|2|37.5261|13.2899
Caltabellotta|2|37.5773|13.2165
Camastra|3|37.2523|13.7936
Cammarata|2|37.6338|13.6377
Campobello di Licata|3|37.2584|13.9183
Canicattì|3|37.3589|13.8504
Casteltermini|2|37.5408|13.6432
Castrofilippo|3|37.3486|13.7501
Cattolica Eraclea|2|37.4408|13.3921
Cianciana|2|37.5197|13.4341
Comitini|3|37.4079|13.643
Favara|3|37.3162|13.6624
Grotte|3|37.4029|13.7007
Joppolo Giancaxio|2|37.387|13.5553
Lampedusa e Linosa|4|35.5111|12.5963
Licata|3|37.1016|13.9376
Lucca Sicula|2|37.579|13.3066
Menfi|1|37.6066|12.9678
Montallegro|2|37.3929|13.3508
Montevago|1|37.7022|12.9858
Naro|3|37.2962|13.7916
Palma di Montechiaro|3|37.1917|13.7637
Porto Empedocle|2|37.2883|13.5275
Racalmuto|3|37.4089|13.7324
Raffadali|2|37.4041|13.5321
Ravanusa|3|37.2679|13.9733
Realmonte|2|37.3084|13.4616
Ribera|2|37.5028|13.2662
Sambuca di Sicilia|2|37.6477|13.111
San Biagio Platani|2|37.509|13.5243
San Giovanni Gemini|2|37.6299|13.6414
Sant'Angelo Muxaro|2|37.479|13.5443
Santa Elisabetta|2|37.4325|13.5562
Santa Margherita di Belice|1|37.6918|13.0201
Santo Stefano Quisquina|2|37.625|13.4908
Sciacca|2|37.5065|13.0823
Siculiana|2|37.3381|13.422
Villafranca Sicula|2|37.5881|13.2892
@CL|Caltanissetta
Acquaviva Platani|3|37.572|13.7029
Bompensiere|3|37.4738|13.7807
Butera|3|37.1904|14.1835
Caltanissetta|3|37.4899|14.0632
Campofranco|3|37.5105|13.711
Delia|3|37.356|13.9273
Gela|2|37.0664|14.2502
Marianopoli|3|37.5974|13.9158
Mazzarino|3|37.305|14.2141
Milena|3|37.4715|13.7364
Montedoro|3|37.4535|13.8162
Mussomeli|3|37.5778|13.7513
Niscemi|2|37.1465|14.3942
Resuttano|2|37.6786|14.0295
Riesi|3|37.282|14.0824
San Cataldo|3|37.4914|13.9935
Santa Caterina Villarmosa|2|37.5911|14.0363
Serradifalco|3|37.4538|13.8805
Sommatino|3|37.334|13.993
Sutera|3|37.5252|13.7313
Vallelunga Pratameno|3|37.682|13.8316
Villalba|3|37.6541|13.8434
@CT|Catania
Aci Bonaccorsi|2|37.5977|15.1079
Aci Castello|2|37.5542|15.1486
Aci Catena|2|37.6026|15.142
Aci Sant'Antonio|2|37.6064|15.1269
Acireale|2|37.6128|15.1659
Adrano|2|37.6618|14.8331
Belpasso|2|37.5892|14.9782
Biancavilla|2|37.6463|14.8614
Bronte|2|37.7872|14.8338
Calatabiano|2|37.8224|15.2276
Caltagirone|2|37.2372|14.5132
Camporotondo Etneo|2|37.5676|15.0051
Castel di Iudica|2|37.4942|14.6497
Castiglione di Sicilia|2|37.8828|15.1222
Catania|2|37.5022|15.0874
Fiumefreddo di Sicilia|2|37.7924|15.2069
Giarre|2|37.7269|15.1877
Grammichele|2|37.2147|14.6365
Gravina di Catania|2|37.5604|15.0618
Licodia Eubea|1|37.1571|14.7061
Linguaglossa|2|37.8426|15.1421
Maletto|2|37.829|14.8657
Maniace|2|37.8624|14.8078
Mascali|2|37.7603|15.1974
Mascalucia|2|37.5736|15.0517
Mazzarrone|2|37.0834|14.5617
Militello in Val di Catania|1|37.2746|14.7939
Milo|2|37.7224|15.1157
Mineo|2|37.2649|14.6908
Mirabella Imbaccari|2|37.3238|14.4459
Misterbianco|2|37.5192|15.0079
Motta Sant'Anastasia|2|37.5134|14.9671
Nicolosi|2|37.6147|15.0263
Palagonia|2|37.3274|14.7453
Paternò|2|37.5671|14.9054
Pedara|2|37.6168|15.0602
Piedimonte Etneo|2|37.8067|15.1782
Raddusa|2|37.4726|14.5325
Ragalna|2|37.637|14.9479
Ramacca|2|37.388|14.6927
Randazzo|2|37.8779|14.9462
Riposto|2|37.7319|15.2042
San Cono|2|37.2899|14.365
San Giovanni la Punta|2|37.5774|15.0942
San Gregorio di Catania|2|37.5653|15.1118
San Michele di Ganzaria|2|37.2796|14.426
San Pietro Clarenza|2|37.5689|15.0229
Sant'Agata li Battiati|2|37.5583|15.0808
Sant'Alfio|2|37.7416|15.1429
Santa Maria di Licodia|2|37.6164|14.8875
Santa Venerina|2|37.689|15.1427
Scordia|1|37.2964|14.8462
Trecastagni|2|37.6161|15.0792
Tremestieri Etneo|2|37.5765|15.0732
Valverde|2|37.577|15.1242
Viagrande|2|37.6102|15.0968
Vizzini|1|37.161|14.7485
Zafferana Etnea|2|37.6933|15.1065
@EN|Enna
Agira|2|37.6562|14.5216
Aidone|2|37.4154|14.4453
Assoro|2|37.6279|14.4239
Barrafranca|3|37.3728|14.2033
Calascibetta|2|37.5902|14.272
Catenanuova|2|37.568|14.6918
Centuripe|2|37.623|14.7391
Cerami|2|37.8107|14.5073
Enna|2|37.5668|14.2807
Gagliano Castelferrato|2|37.7114|14.5367
Leonforte|2|37.6392|14.3924
Nicosia|2|37.7475|14.3973
Nissoria|2|37.6553|14.4495
Piazza Armerina|2|37.3859|14.3672
Pietraperzia|3|37.4216|14.137
Regalbuto|2|37.6535|14.6396
Sperlinga|2|37.7655|14.3516
Troina|2|37.7854|14.5985
Valguarnera Caropepe|2|37.4954|14.3908
Villarosa|2|37.587|14.1736
@ME|Messina
Acquedolci|2|38.056|14.5819
Alcara li Fusi|2|38.0213|14.7014
Alì|1|38.0274|15.4177
Alì Terme|1|38.0051|15.4227
Antillo|2|37.9773|15.2448
Barcellona Pozzo di Gotto|2|38.1483|15.2176
Basicò|2|38.0614|15.0622
Brolo|2|38.1554|14.8296
Capizzi|2|37.8489|14.4785
Capo d'Orlando|2|38.1596|14.7451
Capri Leone|2|38.0859|14.7301
Caronia|2|38.0247|14.4406
Casalvecchio Siculo|2|37.9582|15.3226
Castel di Lucio|2|37.8865|14.3122
Castell'Umberto|2|38.0844|14.8071
Castelmola|2|37.8583|15.2773
Castroreale|2|38.0993|15.2107
Cesarò|2|37.8448|14.7131
Condrò|2|38.1732|15.3269
Falcone|2|38.1175|15.0796
Ficarra|2|38.1091|14.829
Fiumedinisi|1|38.0262|15.3821
Floresta|2|37.9874|14.9097
Fondachelli-Fantina|2|38.0006|15.1824
Forza d'Agrò|2|37.9137|15.3354
Francavilla di Sicilia|2|37.9011|15.1362
Frazzanò|2|38.0723|14.745
Furci Siculo|1|37.9612|15.3817
Furnari|2|38.1047|15.1252
Gaggi|2|37.8601|15.2214
Galati Mamertino|2|38.0316|14.7725
Gallodoro|2|37.9018|15.2937
Giardini-Naxos|2|37.8354|15.2718
Gioiosa Marea|2|38.1733|14.8952
Graniti|2|37.8902|15.2249
Gualtieri Sicaminò|2|38.1632|15.3165
Itala|1|38.0511|15.4369
Leni|2|38.5545|14.8255
Letojanni|2|37.8803|15.3069
Librizzi|2|38.0969|14.9583
Limina|2|37.9408|15.2727
Lipari|2|38.4682|14.9547
Longi|2|38.0273|14.7527
Malfa|2|38.576|14.8355
Malvagna|2|37.9184|15.0554
Mandanici|1|38.0036|15.3171
Mazzarrà Sant'Andrea|2|38.0885|15.1336
Merì|2|38.1668|15.2504
Messina|1|38.1938|15.5542
Milazzo|2|38.2208|15.2415
Militello Rosmarino|2|38.0459|14.676
Mirto|2|38.0847|14.7515
Mistretta|2|37.9299|14.3629
Moio Alcantara|2|37.8997|15.049
Monforte San Giorgio|2|38.1564|15.3833
Mongiuffi Melia|2|37.9059|15.2557
Montagnareale|2|38.1324|14.9465
Montalbano Elicona|2|38.0234|15.0137
Motta Camastra|2|37.8943|15.1703
Motta d'Affermo|2|37.9812|14.3021
Naso|2|38.1221|14.789
Nizza di Sicilia|1|37.9926|15.4119
Novara di Sicilia|2|38.0161|15.1318
Oliveri|2|38.1235|15.0608
Pace del Mela|2|38.1796|15.3053
Pagliara|1|37.9855|15.3597
Patti|2|38.1389|14.9648
Pettineo|2|37.9664|14.2919
Piraino|2|38.1612|14.8619
Raccuja|2|38.0553|14.9096
Reitano|2|37.9728|14.3443
Roccafiorita|2|37.9302|15.2681
Roccalumera|1|37.9763|15.3952
Roccavaldina|2|38.1815|15.3726
Roccella Valdemone|2|37.933|15.0085
Rodì Milici|2|38.069|15.1748
Rometta|1|38.1711|15.4146
San Filippo del Mela|2|38.1697|15.2725
San Fratello|2|38.0134|14.5974
San Marco d'Alunzio|2|38.0735|14.6994
San Pier Niceto|2|38.1589|15.3519
San Piero Patti|2|38.0521|14.9671
San Salvatore di Fitalia|2|38.0717|14.7776
San Teodoro|2|37.8472|14.7001
Sant'Agata di Militello|2|38.0681|14.6333
Sant'Alessio Siculo|1|37.9245|15.3493
Sant'Angelo di Brolo|2|38.1139|14.8827
Santa Domenica Vittoria|2|37.9167|14.9626
Santa Lucia del Mela|2|38.1435|15.2807
Santa Marina Salina|2|38.5612|14.8708
Santa Teresa di Riva|1|37.947|15.3677
Santo Stefano di Camastra|2|38.0154|14.349
Saponara|1|38.1938|15.4345
Savoca|1|37.9559|15.3393
Scaletta Zanclea|1|38.0456|15.4629
Sinagra|2|38.0831|14.8493
Spadafora|2|38.2238|15.3793
Taormina|2|37.8518|15.2857
Terme Vigliatore|2|38.1368|15.1627
Torregrotta|2|38.1916|15.3524
Torrenova|2|38.0898|14.6789
Tortorici|2|38.0301|14.8242
Tripi|2|38.0486|15.0988
Tusa|2|37.9839|14.2361
Ucria|2|38.0459|14.8811
Valdina|2|38.1937|15.3707
Venetico|2|38.2199|15.3667
Villafranca Tirrena|1|38.2401|15.4374
@PA|Palermo
Alia|2|37.7799|13.7139
Alimena|2|37.6935|14.1147
Aliminusa|2|37.8645|13.7812
Altavilla Milicia|2|38.0427|13.5509
Altofonte|2|38.0446|13.2987
Bagheria|2|38.0794|13.5093
Balestrate|2|38.0519|13.0043
Baucina|2|37.9254|13.5377
Belmonte Mezzagno|2|38.0484|13.3906
Bisacquino|2|37.7054|13.2588
Blufi|2|37.7515|14.0748
Bolognetta|2|37.9647|13.4561
Bompietro|2|37.7469|14.0998
Borgetto|2|38.0471|13.1427
Caccamo|2|37.9318|13.6635
Caltavuturo|2|37.8211|13.8902
Campofelice di Fitalia|2|37.8267|13.4859
Campofelice di Roccella|2|37.9923|13.8862
Campofiorito|2|37.7536|13.2688
Camporeale|2|37.8971|13.0938
Capaci|2|38.1707|13.2392
Carini|2|38.1312|13.1819
Castelbuono|2|37.932|14.0886
Casteldaccia|2|38.0541|13.5302
Castellana Sicula|2|37.7832|14.0411
Castronovo di Sicilia|2|37.6789|13.6035
Cefalà Diana|2|37.9152|13.4635
Cefalù|2|38.035|14.0245
Cerda|2|37.9036|13.8155
Chiusa Sclafani|2|37.6772|13.2705
Ciminna|2|37.8968|13.5623
Cinisi|2|38.1549|13.1098
Collesano|2|37.9215|13.9375
Contessa Entellina|1|37.731|13.1831
Corleone|2|37.8121|13.3014
Ficarazzi|2|38.0885|13.4638
Gangi|2|37.7956|14.2067
Geraci Siculo|2|37.8591|14.1544
Giardinello|2|38.088|13.157
Giuliana|2|37.6706|13.2378
Godrano|2|37.9033|13.4289
Gratteri|2|37.9674|13.9739
Isnello|2|37.944|14.0058
Isola delle Femmine|2|38.1983|13.2473
Lascari|2|38.0001|13.9415
Lercara Friddi|2|37.7469|13.6049
Marineo|2|37.9529|13.415
Mezzojuso|2|37.8645|13.4642
Misilmeri|2|38.0352|13.4514
Monreale|2|38.0826|13.292
Montelepre|2|38.089|13.1713
Montemaggiore Belsito|2|37.8478|13.762
Palazzo Adriano|2|37.6813|13.3793
Palermo|2|38.1112|13.3524
Partinico|2|38.0439|13.1198
Petralia Soprana|2|37.7963|14.1085
Petralia Sottana|2|37.8082|14.0925
Piana degli Albanesi|2|37.9948|13.2827
Polizzi Generosa|2|37.8128|13.9997
Pollina|2|37.9929|14.1458
Prizzi|2|37.7215|13.4313
Roccamena|2|37.836|13.1539
Roccapalumba|2|37.8059|13.6385
San Cipirello|2|37.963|13.1754
San Giuseppe Jato|2|37.9705|13.1825
San Mauro Castelverde|2|37.9146|14.1904
Santa Cristina Gela|2|37.9849|13.3281
Santa Flavia|2|38.0813|13.5254
Sciara|2|37.9149|13.7623
Scillato|2|37.8567|13.9069
Sclafani Bagni|2|37.8216|13.8548
Termini Imerese|2|37.9837|13.6956
Terrasini|2|38.1528|13.0821
Torretta|2|38.1301|13.2335
Trabia|2|37.9944|13.6565
Trappeto|2|38.067|13.0366
Ustica|2|38.7104|13.1919
Valledolmo|2|37.7474|13.8279
Ventimiglia di Sicilia|2|37.9233|13.5693
Vicari|2|37.8251|13.5713
Villabate|2|38.0765|13.4437
Villafrati|2|37.908|13.4863
@RG|Ragusa
Acate|2|37.025|14.493
Chiaramonte Gulfi|1|37.0313|14.7013
Comiso|2|36.9507|14.6075
Giarratana|1|37.0481|14.7938
Ispica|2|36.7858|14.9076
Modica|1|36.8589|14.7613
Monterosso Almo|1|37.0889|14.7627
Pozzallo|2|36.7263|14.8463
Ragusa|1|36.922|14.7213
Santa Croce Camerina|2|36.8279|14.5255
Scicli|2|36.7936|14.707
Vittoria|2|36.9515|14.5305
@SR|Siracusa
Augusta|1|37.2369|15.2197
Avola|2|36.9095|15.135
Buccheri|1|37.1265|14.8504
Buscemi|1|37.0855|14.8842
Canicattini Bagni|1|37.0349|15.0623
Carlentini|1|37.2759|15.015
Cassaro|1|37.1069|14.9476
Ferla|1|37.1186|14.9411
Floridia|1|37.0869|15.1519
Francofonte|1|37.2266|14.8819
Lentini|1|37.2847|14.9988
Melilli|1|37.1783|15.1266
Noto|1|36.8909|15.0706
Pachino|2|36.7152|15.0915
Palazzolo Acreide|1|37.0619|14.9039
Portopalo di Capo Passero|2|36.6838|15.1333
Priolo Gargallo|1|37.1579|15.186
Rosolini|2|36.8205|14.9526
Siracusa|1|37.0646|15.2907
Solarino|1|37.1012|15.119
Sortino|1|37.1569|15.0277
@TP|Trapani
Alcamo|2|37.9766|12.9627
Buseto Palizzolo|2|38.0125|12.7116
Calatafimi-Segesta|2|37.9136|12.8619
Campobello di Mazara|2|37.6358|12.7443
Castellammare del Golfo|2|38.0188|12.8858
Castelvetrano|2|37.6829|12.7955
Custonaci|2|38.0782|12.6752
Erice|2|38.0382|12.5872
Favignana|2|37.9314|12.3274
Gibellina|1|37.807|12.8695
Marsala|2|37.7979|12.4342
Mazara del Vallo|2|37.6537|12.5887
Misiliscemi|2|37.9257|12.5376
Paceco|2|37.9813|12.5573
Pantelleria|4|36.8315|11.945
Partanna|1|37.7278|12.8885
Petrosino|2|37.7162|12.4945
Poggioreale|1|37.7621|13.0343
Salaparuta|1|37.7579|13.0097
Salemi|1|37.8174|12.8009
San Vito Lo Capo|2|38.1723|12.7349
Santa Ninfa|1|37.7713|12.8776
Trapani|2|38.0174|12.516
Valderice|2|38.039|12.617
Vita|2|37.8686|12.8145
#Toscana
@AR|Arezzo
Anghiari|2|43.541|12.0546
Arezzo|2|43.5172|11.7639
Badia Tedalda|2|43.7092|12.1849
Bibbiena|2|43.6955|11.8173
Bucine|3|43.4792|11.617
Capolona|2|43.564|11.8588
Caprese Michelangelo|2|43.6399|11.9848
Castel Focognano|2|43.654|11.7884
Castel San Niccolò|2|43.7229|11.6566
Castelfranco Piandiscò|3|43.6395|11.5646
Castiglion Fibocchi|3|43.528|11.7632
Castiglion Fiorentino|2|43.3417|11.9238
Cavriglia|3|43.5219|11.489
Chitignano|2|43.6624|11.8813
Chiusi della Verna|2|43.695|11.9386
Civitella in Val di Chiana|3|43.4025|11.7356
Cortona|2|43.2753|11.9851
Foiano della Chiana|2|43.2525|11.8188
Laterina Pergine Valdarno|3|43.4925|11.6881
Loro Ciuffenna|3|43.5923|11.633
Lucignano|3|43.2745|11.746
Marciano della Chiana|2|43.3052|11.7864
Monte San Savino|3|43.3314|11.7254
Montemignaio|2|43.7399|11.62
Monterchi|2|43.4856|12.1117
Montevarchi|3|43.5235|11.5676
Ortignano Raggiolo|2|43.6728|11.7156
Pieve Santo Stefano|2|43.6694|12.0416
Poppi|2|43.7228|11.7661
Pratovecchio Stia|2|43.822|11.6993
San Giovanni Valdarno|3|43.5649|11.5306
Sansepolcro|2|43.5701|12.1404
Sestino|2|43.7084|12.2965
Subbiano|2|43.5748|11.8704
Talla|2|43.6015|11.788
Terranuova Bracciolini|3|43.5512|11.5858
@FI|Firenze
Bagno a Ripoli|3|43.7522|11.32
Barberino di Mugello|2|44.0005|11.2384
Barberino Tavarnelle|3|43.5456|11.2047
Borgo San Lorenzo|2|43.9542|11.3865
Calenzano|3|43.8652|11.1674
Campi Bisenzio|3|43.8216|11.1367
Capraia e Limite|3|43.7596|10.9997
Castelfiorentino|3|43.6056|10.9712
Cerreto Guidi|3|43.7589|10.879
Certaldo|3|43.5479|11.0412
Dicomano|2|43.892|11.5236
Empoli|3|43.7195|10.9459
Fiesole|3|43.8067|11.2931
Figline e Incisa Valdarno|3|43.6308|11.4629
Firenze|3|43.7699|11.2556
Firenzuola|2|44.1191|11.3792
Fucecchio|3|43.7292|10.8082
Gambassi Terme|3|43.5391|10.9541
Greve in Chianti|3|43.5825|11.3169
Impruneta|3|43.6853|11.2547
Lastra a Signa|3|43.771|11.1072
Londa|2|43.8606|11.5668
Marradi|2|44.0757|11.6129
Montaione|3|43.5529|10.9128
Montelupo Fiorentino|3|43.7332|11.0209
Montespertoli|3|43.6435|11.0751
Palazzuolo sul Senio|2|44.1123|11.5477
Pelago|2|43.7718|11.5046
Pontassieve|3|43.7754|11.44
Reggello|3|43.6831|11.5369
Rignano sull'Arno|3|43.721|11.4514
Rufina|2|43.8267|11.4901
San Casciano in Val di Pesa|3|43.657|11.1857
San Godenzo|2|43.9256|11.6184
Scandicci|3|43.7567|11.1848
Scarperia e San Piero|2|44.011|11.3314
Sesto Fiorentino|3|43.8317|11.1992
Signa|3|43.7807|11.0965
Vaglia|2|43.9071|11.2818
Vicchio|2|43.9332|11.4653
Vinci|3|43.7874|10.9271
@GR|Grosseto
Arcidosso|3|42.8716|11.5383
Campagnatico|3|42.8837|11.2735
Capalbio|4|42.4549|11.4195
Castel del Piano|3|42.8932|11.5384
Castell'Azzara|2|42.7716|11.6992
Castiglione della Pescaia|4|42.7639|10.8791
Cinigiano|3|42.8904|11.3929
Civitella Paganico|3|43.0241|11.2893
Follonica|4|42.9263|10.7616
Gavorrano|4|42.9254|10.9058
Grosseto|4|42.7751|11.2878
Isola del Giglio|4|42.3532|10.8965
Magliano in Toscana|4|42.5994|11.2917
Manciano|3|42.5873|11.516
Massa Marittima|3|43.0501|10.8881
Monte Argentario|4|42.4074|11.1504
Monterotondo Marittimo|3|43.1456|10.8558
Montieri|3|43.1307|11.0163
Orbetello|4|42.4381|11.2107
Pitigliano|3|42.6348|11.6735
Roccalbegna|3|42.786|11.5077
Roccastrada|3|43.0099|11.1665
Santa Fiora|2|42.8316|11.5859
Scansano|3|42.6884|11.3355
Scarlino|4|42.9074|10.852
Seggiano|3|42.9288|11.5582
Semproniano|3|42.7307|11.5403
Sorano|3|42.6815|11.7136
@LI|Livorno
Bibbona|3|43.2698|10.5973
Campiglia Marittima|4|43.0606|10.6155
Campo nell'Elba|4|42.7588|10.199
Capoliveri|4|42.7435|10.3788
Capraia Isola|4|43.0482|9.8434
Castagneto Carducci|3|43.1607|10.611
Cecina|3|43.3113|10.5173
Collesalvetti|3|43.5889|10.4763
Livorno|3|42.7902|10.3403
Marciana|4|42.7894|10.1685
Marciana Marina|4|42.8036|10.1968
Piombino|4|42.9232|10.5268
Porto Azzurro|4|42.7663|10.3958
Portoferraio|4|42.8116|10.3131
Rio|4|42.8325|10.4118
Rosignano Marittimo|3|43.4068|10.4734
San Vincenzo|4|43.1007|10.5388
Sassetta|4|43.129|10.6439
Suvereto|4|43.079|10.6787
@LU|Lucca
Altopascio|3|43.815|10.6744
Bagni di Lucca|2|44.01|10.5906
Barga|2|44.0739|10.4843
Borgo a Mozzano|2|43.9789|10.5457
Camaiore|3|43.9381|10.304
Camporgiano|2|44.1581|10.3352
Capannori|3|43.842|10.5735
Careggine|2|44.1199|10.3254
Castelnuovo di Garfagnana|2|44.11|10.4118
Castiglione di Garfagnana|2|44.1499|10.4109
Coreglia Antelminelli|2|44.0637|10.5255
Fabbriche di Vergemoli|2|44.0148|10.3911
Forte dei Marmi|3|43.9596|10.1699
Fosciandora|2|44.1165|10.4595
Gallicano|2|44.0607|10.4357
Lucca|3|44.0178|10.4544
Massarosa|3|43.8676|10.3397
Minucciano|2|44.1704|10.2076
Molazzana|2|44.0717|10.4178
Montecarlo|3|43.8512|10.6676
Pescaglia|2|43.9662|10.4111
Piazza al Serchio|2|44.1835|10.3009
Pietrasanta|3|43.9589|10.2332
Pieve Fosciana|2|44.1323|10.4108
Porcari|3|43.8409|10.6176
San Romano in Garfagnana|2|44.1697|10.3471
Seravezza|3|43.9947|10.2258
Sillano Giuncugnano|2|44.2545|10.3157
Stazzema|2|44.0116|10.3135
Vagli Sotto|2|44.1092|10.2888
Viareggio|3|43.8672|10.2506
Villa Basilica|2|43.9275|10.6446
Villa Collemandina|2|44.1588|10.3977
@MS|Massa Carrara
Aulla|2|44.2145|9.9678
Bagnone|2|44.3147|9.9947
Carrara|3|44.0792|10.1024
Casola in Lunigiana|2|44.2|10.1755
Comano|2|44.2935|10.1312
Filattiera|2|44.3308|9.9348
Fivizzano|2|44.2383|10.126
Fosdinovo|2|44.1338|10.0189
Licciana Nardi|2|44.2649|10.0384
Massa|3|44.0359|10.1396
Montignoso|3|44.0241|10.1726
Mulazzo|2|44.3159|9.8896
Podenzana|2|44.2062|9.942
Pontremoli|2|44.3752|9.8789
Tresana|2|44.2542|9.9129
Villafranca in Lunigiana|2|44.2947|9.9497
Zeri|2|44.3537|9.7632
@PI|Pisa
Bientina|3|43.7102|10.6203
Buti|3|43.7273|10.5877
Calci|3|43.7258|10.5153
Calcinaia|3|43.6832|10.6153
Capannoli|3|43.5867|10.6745
Casale Marittimo|3|43.2971|10.6153
Casciana Terme Lari|3|43.5522|10.5942
Cascina|3|43.6767|10.5492
Castelfranco di Sotto|3|43.6997|10.7452
Castellina Marittima|3|43.4126|10.5762
Castelnuovo di Val di Cecina|3|43.208|10.9061
Chianni|3|43.4861|10.6424
Crespina Lorenzana|3|43.5879|10.5547
Fauglia|3|43.5706|10.5144
Guardistallo|3|43.3127|10.6328
Lajatico|3|43.4754|10.7283
Montecatini Val di Cecina|3|43.3928|10.7491
Montescudaio|3|43.3263|10.627
Monteverdi Marittimo|3|43.1774|10.7144
Montopoli in Val d'Arno|3|43.6703|10.7608
Orciano Pisano|3|43.4944|10.5115
Palaia|3|43.605|10.772
Peccioli|3|43.548|10.7208
Pisa|3|43.7159|10.4019
Pomarance|3|43.2992|10.8724
Ponsacco|3|43.6207|10.6308
Pontedera|3|43.6635|10.6355
Riparbella|3|43.3646|10.5995
San Giuliano Terme|3|43.763|10.441
San Miniato|3|43.6797|10.8501
Santa Croce sull'Arno|3|43.7101|10.7819
Santa Luce|3|43.4723|10.5635
Santa Maria a Monte|3|43.6981|10.693
Terricciola|3|43.5247|10.6801
Vecchiano|3|43.7833|10.3844
Vicopisano|3|43.6998|10.5847
Volterra|3|43.4003|10.86
@PT|Pistoia
Abetone Cutigliano|2|44.1249|10.7112
Agliana|3|43.9038|11.0034
Buggiano|3|43.8999|10.7266
Chiesina Uzzanese|3|43.8391|10.7193
Lamporecchio|3|43.8164|10.8963
Larciano|3|43.825|10.8564
Marliana|2|43.9337|10.7693
Massa e Cozzile|3|43.9174|10.7537
Monsummano Terme|3|43.8707|10.814
Montale|2|43.9352|11.0159
Montecatini-Terme|3|43.8832|10.771
Pescia|3|43.9017|10.6898
Pieve a Nievole|3|43.8791|10.7961
Pistoia|2|43.9741|10.8687
Ponte Buggianese|3|43.8409|10.7475
Quarrata|3|43.8475|10.9777
Sambuca Pistoiese|2|44.0549|11.0025
San Marcello Piteglio|2|44.0677|10.812
Serravalle Pistoiese|3|43.9059|10.833
Uzzano|3|43.8926|10.7061
@PO|Prato
Cantagallo|2|44.0222|11.0798
Carmignano|3|43.8141|11.019
Montemurlo|2|43.927|11.0374
Poggio a Caiano|3|43.8161|11.0547
Prato|3|43.9357|11.0941
Vaiano|2|43.969|11.1241
Vernio|2|44.0441|11.1499
@SI|Siena
Abbadia San Salvatore|2|42.881|11.6724
Asciano|3|43.2349|11.5595
Buonconvento|3|43.1376|11.4813
Casole d'Elsa|3|43.3417|11.0429
Castellina in Chianti|3|43.4692|11.2873
Castelnuovo Berardenga|3|43.3463|11.5033
Castiglione d'Orcia|3|43.0071|11.6155
Cetona|3|42.9647|11.9004
Chianciano Terme|3|43.0583|11.8284
Chiusdino|3|43.1546|11.0842
Chiusi|3|43.016|11.9475
Colle di Val d'Elsa|3|43.4226|11.1264
Gaiole in Chianti|3|43.4683|11.4342
Montalcino|3|43.0583|11.4901
Montepulciano|3|43.0927|11.781
Monteriggioni|3|43.3901|11.2234
Monteroni d'Arbia|3|43.2293|11.4209
Monticiano|3|43.1397|11.1801
Murlo|3|43.1608|11.3879
Piancastagnaio|2|42.849|11.6929
Pienza|3|43.0765|11.6789
Poggibonsi|3|43.465|11.1483
Radda in Chianti|3|43.4871|11.3747
Radicofani|2|42.8965|11.7697
Radicondoli|3|43.2612|11.0421
Rapolano Terme|3|43.2873|11.6029
San Casciano dei Bagni|2|42.8718|11.875
San Gimignano|3|43.4678|11.0432
San Quirico d'Orcia|3|43.0593|11.6044
Sarteano|3|42.9899|11.8687
Siena|3|43.1672|11.4672
Sinalunga|3|43.2121|11.7365
Sovicille|3|43.2806|11.2282
Torrita di Siena|3|43.1668|11.7716
Trequanda|3|43.1889|11.6674
#Trentino-Alto Adige
@BZ|Bolzano
Aldino/Aldein|4|46.3687|11.3543
Andriano/Andrian|4|46.5176|11.2314
Anterivo/Altrei|4|46.2797|11.368
Appiano sulla strada del vino/Eppan an der Weinstraße|4|46.4619|11.2609
Avelengo/Hafling|4|46.6446|11.2244
Badia/Abtei|4|46.6101|11.8935
Barbiano/Barbian|4|46.6033|11.5198
Bolzano/Bozen|4|46.6559|11.2296
Braies/Prags|4|46.6886|12.1038
Brennero/Brenner|4|47.0038|11.5046
Bressanone/Brixen|4|46.7165|11.6579
Bronzolo/Branzoll|4|46.4043|11.3201
Brunico/Bruneck|4|46.7963|11.9355
Caines/Kuens|4|46.6995|11.1695
Caldaro sulla strada del vino/Kaltern an der Weinstraße|4|46.4133|11.2462
Campo di Trens/Freienfeld|4|46.8572|11.509
Campo Tures/Sand in Taufers|4|46.9192|11.9552
Castelbello-Ciardes/Kastelbell-Tschars|4|46.6222|10.924
Castelrotto/Kastelruth|4|46.5475|11.6083
Cermes/Tscherms|4|46.6346|11.1466
Chienes/Kiens|4|46.8094|11.8409
Chiusa/Klausen|4|46.6397|11.5666
Cornedo all'Isarco/Karneid|4|46.4899|11.4084
Cortaccia sulla strada del vino/Kurtatsch an der Weinstraße|4|46.3135|11.2235
Cortina sulla strada del vino/Kurtinig an der Weinstraße|4|46.2687|11.2227
Corvara in Badia/Corvara|4|46.5496|11.874
Curon Venosta/Graun im Vinschgau|4|46.8037|10.555
Dobbiaco/Toblach|4|46.7356|12.224
Egna/Neumarkt|4|46.3169|11.2726
Falzes/Pfalzen|4|46.812|11.884
Fiè allo Sciliar/Völs am Schlern|4|46.5176|11.5026
Fortezza/Franzensfeste|4|46.7896|11.61
Funes/Villnöß|4|46.6451|11.6968
Gais/Gais|4|46.8332|11.9475
Gargazzone/Gargazon|4|46.5848|11.2027
Glorenza/Glurns|4|46.6715|10.5539
La Valle/Wengen|4|46.6577|11.9243
Laces/Latsch|4|46.6173|10.8595
Lagundo/Algund|4|46.6825|11.1231
Laion/Lajen|4|46.6092|11.5643
Laives/Leifers|4|46.4228|11.3348
Lana/Lana|4|46.616|11.1449
Lasa/Laas|4|46.6166|10.7002
Lauregno/Laurein|4|46.4544|11.062
Luson/Lüsen|4|46.7465|11.7611
Magrè sulla strada del vino/Margreid an der Weinstraße|4|46.2874|11.2098
Malles Venosta/Mals|4|46.6879|10.5465
Marebbe/Enneberg|4|46.6489|12.0269
Marlengo/Marling|4|46.6556|11.1403
Martello/Martell|4|46.5153|10.7214
Meltina/Mölten|4|46.5864|11.2562
Merano/Meran|4|46.6696|11.1594
Monguelfo-Tesido/Welsberg-Taisten|4|46.7811|12.1189
Montagna sulla strada del vino/Montan an der Weinstraße|4|46.3308|11.3046
Moso in Passiria/Moos in Passeier|4|46.8318|11.1673
Nalles/Nals|4|46.5435|11.2046
Naturno/Naturns|4|46.6499|11.0042
Naz-Sciaves/Natz-Schabs|4|46.7631|11.6779
Nova Levante/Welschnofen|4|46.4302|11.5389
Nova Ponente/Deutschnofen|4|46.414|11.4252
Ora/Auer|4|46.3466|11.2986
Ortisei/St. Ulrich|4|46.5905|11.6846
Parcines/Partschins|4|46.6838|11.0735
Perca/Percha|4|46.7943|11.9824
Plaus/Plaus|4|46.6566|11.0415
Ponte Gardena/Waidbruck|4|46.5982|11.5325
Postal/Burgstall|4|46.6076|11.1933
Prato allo Stelvio/Prad am Stilfserjoch|4|46.6038|10.5819
Predoi/Prettau|4|47.0407|12.1059
Proves/Proveis|4|46.4774|11.0224
Racines/Ratschings|4|46.8801|11.3761
Rasun-Anterselva/Rasen-Antholz|4|46.839|12.1116
Renon/Ritten|4|46.5629|11.4414
Rifiano/Riffian|4|46.7036|11.1814
Rio di Pusteria/Mühlbach|4|46.7959|11.6668
Rodengo/Rodeneck|4|46.7808|11.6898
Salorno sulla strada del vino/Salurn an der Weinstraße|4|46.2396|11.2111
San Candido/Innichen|4|46.7329|12.2824
San Genesio Atesino/Jenesien|4|46.535|11.3314
San Leonardo in Passiria/St. Leonhard in Passeier|4|46.8119|11.2471
San Lorenzo di Sebato/St. Lorenzen|4|46.7834|11.9026
San Martino in Badia/St. Martin in Thurn|4|46.6509|11.8417
San Martino in Passiria/St. Martin in Passeier|4|46.7839|11.2268
San Pancrazio/St. Pankraz|4|46.5865|11.0864
Santa Cristina Valgardena/St. Christina in Gröden|4|46.5589|11.72
Sarentino/Sarntal|4|46.6953|11.3874
Scena/Schenna|4|46.69|11.1866
Selva dei Molini/Mühlwald|4|46.8907|11.8567
Selva di Val Gardena/Wolkenstein in Gröden|4|46.5526|11.7665
Senale-San Felice/Unsere Liebe Frau im Walde-St. Felix|4|46.5095|11.1373
Senales/Schnals|4|46.7277|10.8628
Sesto/Sexten|4|46.7027|12.3505
Silandro/Schlanders|4|46.6281|10.7735
Sluderno/Schluderns|4|46.6645|10.5848
Stelvio/Stilfs|4|46.5424|10.5578
Terento/Terenten|4|46.8288|11.776
Terlano/Terlan|4|46.5293|11.2487
Termeno sulla strada del vino/Tramin an der Weinstraße|4|46.3415|11.2423
Tesimo/Tisens|4|46.5639|11.1695
Tires/Tiers|4|46.4673|11.5275
Tirolo/Tirol|4|46.7085|11.1424
Trodena nel parco naturale/Truden im Naturpark|4|46.3221|11.3498
Tubre/Taufers im Münstertal|4|46.6456|10.4642
Ultimo/Ulten|4|46.512|10.8995
Vadena/Pfatten|4|46.414|11.3051
Val di Vizze/Pfitsch|4|46.949|11.5775
Valdaora/Olang|4|46.7598|12.031
Valle Aurina/Ahrntal|4|46.9884|11.9429
Valle di Casies/Gsies|4|46.8241|12.2325
Vandoies/Vintl|4|46.876|11.7209
Varna/Vahrn|4|46.7404|11.6346
Velturno/Feldthurns|4|46.6687|11.5984
Verano/Vöran|4|46.6054|11.2263
Villabassa/Niederdorf|4|46.7395|12.17
Villandro/Villanders|4|46.6329|11.5401
Vipiteno/Sterzing|4|46.8963|11.4319
@TN|Trento
Ala|2|45.7579|11.0018
Albiano|3|46.1449|11.1935
Aldeno|3|45.9768|11.0909
Altavalle|3|46.2167|11.253
Altopiano della Vigolana|3|45.9845|11.1998
Amblar-Don|3|46.385|11.1722
Andalo|3|46.1661|11.0034
Arco|3|45.9181|10.8861
Avio|2|45.7338|10.9372
Baselga di Pinè|3|46.1313|11.2568
Bedollo|3|46.1677|11.3016
Besenello|3|45.9419|11.1095
Bieno|3|46.0807|11.554
Bleggio Superiore|3|46.0069|10.7896
Bocenago|3|46.1191|10.7589
Bondone|3|45.8062|10.5515
Borgo Chiese|3|45.8924|10.562
Borgo d'Anaunia|4|46.4632|11.1491
Borgo Lares|3|46.0046|10.7273
Borgo Valsugana|3|46.0533|11.4566
Brentonico|3|45.8188|10.956
Bresimo|4|46.4233|10.9287
Caderzone Terme|3|46.1302|10.7575
Calceranica al Lago|3|46.0042|11.2429
Caldes|4|46.3654|10.9426
Caldonazzo|3|45.9915|11.2621
Calliano|3|45.9339|11.0938
Campitello di Fassa|3|46.4762|11.7415
Campodenno|3|46.2578|11.0332
Canal San Bovo|3|46.1548|11.733
Canazei|3|46.4769|11.7711
Capriana|3|46.2619|11.3386
Carisolo|3|46.1688|10.7592
Carzano|3|46.0703|11.4933
Castel Condino|3|45.9144|10.6028
Castel Ivano|3|46.0631|11.5418
Castello Tesino|3|46.0642|11.6322
Castello-Molina di Fiemme|3|46.2561|11.4044
Castelnuovo|3|46.0529|11.4933
Cavalese|3|46.2912|11.4605
Cavareno|3|46.4084|11.1381
Cavedago|3|46.1847|11.0314
Cavedine|3|45.9952|10.9736
Cavizzana|4|46.3675|10.9579
Cembra Lisignago|3|46.1807|11.2008
Cimone|3|45.9798|11.063
Cinte Tesino|3|46.0568|11.6149
Cis|4|46.3992|11.003
Civezzano|3|46.0894|11.18
Cles|4|46.3653|11.0332
Comano Terme|3|46.0091|10.8836
Commezzadura|3|46.313|10.8328
Contà|3|46.2951|11.0189
Croviana|4|46.3448|10.9034
Dambel|4|46.4047|11.0931
Denno|3|46.275|11.0491
Dimaro Folgarida|3|46.3022|10.8869
Drena|3|45.9693|10.9445
Dro|3|45.9615|10.9111
Fai della Paganella|3|46.1793|11.0689
Fiavè|3|46.0046|10.8421
Fierozzo|3|46.1081|11.3463
Folgaria|3|45.915|11.173
Fornace|3|46.1182|11.2065
Frassilongo|3|46.0809|11.3195
Garniga Terme|3|46.0026|11.0871
Giovo|3|46.1858|11.1468
Giustino|3|46.1484|10.7695
Grigno|3|46.017|11.6359
Imer|3|46.1511|11.7963
Isera|3|45.8853|11.0093
Lavarone|3|45.9413|11.2886
Lavis|3|46.1397|11.1102
Ledro|3|45.8864|10.7154
Levico Terme|3|46.0091|11.3018
Livo|4|46.4047|11.0193
Lona-Lases|3|46.1498|11.2192
Luserna|3|45.9217|11.3243
Madruzzo|3|46.0329|11.0035
Malé|4|46.3516|10.9129
Massimeno|3|46.1418|10.7731
Mazzin|3|46.4688|11.7004
Mezzana|3|46.3173|10.801
Mezzano|3|46.1547|11.808
Mezzocorona|3|46.2154|11.1208
Mezzolombardo|3|46.2121|11.0935
Moena|3|46.3769|11.6593
Molveno|3|46.1421|10.9638
Mori|3|45.8524|10.9783
Nago-Torbole|3|45.8512|10.8851
Nogaredo|3|45.9121|11.023
Nomi|3|45.9286|11.0719
Novaledo|3|46.0228|11.3664
Novella|4|46.437|11.0781
Ospedaletto|3|46.0436|11.553
Ossana|3|46.3065|10.7377
Palù del Fersina|3|46.1307|11.3665
Panchià|3|46.2857|11.5426
Peio|3|46.3629|10.6732
Pellizzano|3|46.3098|10.7605
Pelugo|3|46.0885|10.7239
Pergine Valsugana|3|46.0605|11.2407
Pieve di Bono-Prezzo|3|45.9452|10.6732
Pieve Tesino|3|46.0693|11.6081
Pinzolo|3|46.1617|10.765
Pomarolo|3|45.9281|11.0431
Porte di Rendena|3|46.0732|10.6731
Predaia|3|46.3353|11.0897
Predazzo|3|46.3124|11.6027
Primiero San Martino di Castrozza|3|46.2437|11.836
Rabbi|3|46.4009|10.8249
Riva del Garda|3|45.8848|10.8397
Romeno|3|46.394|11.1203
Roncegno Terme|3|46.0516|11.4103
Ronchi Valsugana|3|46.0684|11.4352
Ronzo-Chienis|3|45.8896|10.9501
Ronzone|4|46.4231|11.1489
Roverè della Luna|3|46.25|11.1693
Rovereto|3|45.8865|11.0452
Ruffrè-Mendola|3|46.4246|11.1941
Rumo|4|46.4611|10.9882
Sagron Mis|2|46.1914|11.9336
Samone|3|46.0816|11.5226
San Giovanni di Fassa-Sèn Jan|3|46.4229|11.7208
San Lorenzo Dorsino|3|46.1121|10.9001
San Michele all'Adige|3|46.1929|11.1336
Sant'Orsola Terme|3|46.1081|11.3027
Sanzeno|3|46.3792|11.0715
Sarnonico|4|46.4187|11.1408
Scurelle|3|46.0645|11.5059
Segonzano|3|46.1926|11.2819
Sella Giudicarie|3|46.0227|10.6337
Sfruz|3|46.3372|11.1158
Soraga di Fassa|3|46.3946|11.6662
Sover|3|46.2217|11.3157
Spiazzo|3|46.1036|10.7394
Spormaggiore|3|46.2178|11.0483
Sporminore|3|46.2368|11.0303
Stenico|3|46.0522|10.8541
Storo|3|45.8491|10.5799
Strembo|3|46.1199|10.7515
Telve|3|46.0713|11.4796
Telve di Sopra|3|46.0714|11.4717
Tenna|3|46.0157|11.2643
Tenno|3|45.9188|10.8328
Terragnolo|3|45.8652|11.1774
Terre d'Adige|3|46.1639|11.0692
Terzolas|4|46.3616|10.9261
Tesero|3|46.2904|11.512
Tione di Trento|3|46.0363|10.7269
Ton|3|46.2592|11.1017
Torcegno|3|46.0743|11.4498
Trambileno|3|45.8348|11.1392
Tre Ville|3|46.0743|10.7711
Trento|3|46.0664|11.1258
Valdaone|3|46.0249|10.5251
Valfloriana|3|46.2469|11.3487
Vallarsa|2|45.8034|11.1051
Vallelaghi|3|46.0998|11.0162
Vermiglio|3|46.2969|10.6914
Vignola-Falesina|3|46.0552|11.2816
Villa Lagarina|3|45.915|11.033
Ville d'Anaunia|3|46.2738|10.9402
Ville di Fiemme|3|46.3164|11.4454
Volano|3|45.9172|11.0608
Ziano di Fiemme|3|46.2865|11.566
#Umbria
@PG|Perugia
Assisi|2|43.0712|12.6147
Bastia Umbra|2|43.0678|12.5496
Bettona|2|43.0136|12.4848
Bevagna|2|42.9341|12.6091
Campello sul Clitunno|1|42.8229|12.7763
Cannara|2|42.9947|12.5794
Cascia|1|42.717|13.0135
Castel Ritaldi|2|42.8233|12.6723
Castiglione del Lago|2|43.1271|12.0452
Cerreto di Spoleto|1|42.821|12.9176
Citerna|2|43.4984|12.1155
Città della Pieve|3|42.9527|12.0043
Città di Castello|2|43.4574|12.2403
Collazzone|2|42.9005|12.4352
Corciano|2|43.129|12.2877
Costacciaro|2|43.3604|12.7124
Deruta|2|42.9823|12.4196
Foligno|1|42.9562|12.7033
Fossato di Vico|2|43.2976|12.7599
Fratta Todina|2|42.858|12.3647
Giano dell'Umbria|2|42.8335|12.5777
Gualdo Cattaneo|2|42.9094|12.5558
Gualdo Tadino|2|43.2317|12.781
Gubbio|2|43.3518|12.5773
Lisciano Niccone|2|43.2468|12.1431
Magione|2|43.1427|12.2035
Marsciano|2|42.91|12.337
Massa Martana|2|42.7731|12.525
Monte Castello di Vibio|2|42.8407|12.3523
Monte Santa Maria Tiberina|2|43.4378|12.1625
Montefalco|2|42.8919|12.6501
Monteleone di Spoleto|1|42.651|12.9516
Montone|2|43.3623|12.3263
Nocera Umbra|2|43.1136|12.7886
Norcia|1|42.7924|13.0929
Paciano|2|43.0224|12.0705
Panicale|2|43.0291|12.0984
Passignano sul Trasimeno|2|43.1847|12.1368
Perugia|2|43.107|12.403
Piegaro|2|42.9698|12.0863
Pietralunga|2|43.4422|12.4372
Poggiodomo|1|42.7112|12.9339
Preci|1|42.8785|13.0391
San Giustino|2|43.549|12.1758
Sant'Anatolia di Narco|1|42.7338|12.8356
Scheggia e Pascelupo|2|43.4183|12.7127
Scheggino|1|42.7126|12.8314
Sellano|1|42.8884|12.9263
Sigillo|2|43.3314|12.7423
Spello|2|42.9909|12.6718
Spoleto|1|42.7355|12.7363
Todi|2|42.7824|12.4063
Torgiano|2|43.0285|12.4414
Trevi|1|42.8775|12.7475
Tuoro sul Trasimeno|2|43.2068|12.0746
Umbertide|2|43.3056|12.3366
Valfabbrica|2|43.1589|12.6009
Vallo di Nera|1|42.7546|12.8638
Valtopina|2|43.0583|12.7547
@TR|Terni
Acquasparta|2|42.6912|12.5465
Allerona|3|42.812|11.9731
Alviano|3|42.5882|12.2959
Amelia|2|42.5535|12.4168
Arrone|1|42.5834|12.7699
Attigliano|3|42.5143|12.2925
Avigliano Umbro|2|42.6548|12.4262
Baschi|2|42.6703|12.2161
Calvi dell'Umbria|2|42.4031|12.5674
Castel Giorgio|3|42.7079|11.9794
Castel Viscardo|3|42.7547|12.0013
Fabro|3|42.8635|12.0129
Ferentillo|1|42.6208|12.7887
Ficulle|3|42.8363|12.0656
Giove|3|43.0815|12.7756
Guardea|3|42.6234|12.2977
Lugnano in Teverina|3|42.5742|12.3308
Montecastrilli|2|42.6524|12.4886
Montecchio|3|42.6635|12.2869
Montefranco|1|42.5977|12.7653
Montegabbione|3|42.921|12.0924
Monteleone d'Orvieto|3|42.9185|12.0511
Narni|2|42.5196|12.5152
Orvieto|3|42.7186|12.1088
Otricoli|2|42.423|12.4777
Parrano|3|42.8639|12.1061
Penna in Teverina|3|42.493|12.3556
Polino|1|42.5848|12.8428
Porano|3|42.6817|12.1021
San Gemini|2|42.6127|12.5465
San Venanzo|2|42.8693|12.2699
Stroncone|2|42.5023|12.66
Terni|2|42.6538|12.4398
#Valle d'Aosta
@AO|Aosta
Allein|3|45.8078|7.2725
Antey-Saint-André|3|45.8065|7.5982
Aosta|3|45.7371|7.3197
Arnad|3|45.6445|7.7222
Arvier|3|45.7025|7.1665
Avise|3|45.7086|7.1397
Ayas|3|45.8626|7.7319
Aymavilles|3|45.7017|7.2477
Bard|3|45.6097|7.7457
Bionaz|3|45.9132|7.498
Brissogne|3|45.7285|7.4067
Brusson|3|45.7593|7.7304
Challand-Saint-Anselme|3|45.7155|7.763
Challand-Saint-Victor|3|45.6839|7.7352
Chambave|3|45.7105|7.5507
Chamois|3|45.8382|7.6197
Champdepraz|3|45.6853|7.6578
Champorcher|3|45.6239|7.621
Charvensod|3|45.7209|7.3261
Châtillon|3|45.7488|7.6125
Cogne|3|45.6087|7.356
Courmayeur|3|45.7874|6.9731
Donnas|3|45.6038|7.7697
Doues|3|45.8194|7.3066
Emarèse|3|45.7242|7.6902
Etroubles|3|45.8206|7.2306
Fénis|3|45.736|7.4944
Fontainemore|3|45.6483|7.8603
Gaby|3|45.7107|7.8901
Gignod|3|45.7792|7.2957
Gressan|3|45.7192|7.2851
Gressoney-La-Trinité|3|45.8296|7.8241
Gressoney-Saint-Jean|3|45.7793|7.825
Hône|3|45.6137|7.7378
Introd|3|45.6905|7.1866
Issime|3|45.6866|7.8538
Issogne|3|45.6544|7.6846
Jovençan|3|45.7151|7.2763
La Magdeleine|3|45.8141|7.6219
La Salle|3|45.7454|7.0706
La Thuile|3|45.7163|6.9486
Lillianes|3|45.6326|7.8446
Montjovet|3|45.7124|7.659
Morgex|3|45.758|7.0354
Nus|3|45.7412|7.4696
Ollomont|3|45.8497|7.3106
Oyace|3|45.8508|7.3829
Perloz|3|45.6138|7.8084
Pollein|3|45.728|7.3522
Pont-Saint-Martin|3|45.5994|7.7994
Pontboset|3|45.6076|7.6864
Pontey|3|45.7174|7.5833
Pré-Saint-Didier|3|45.7639|6.9853
Quart|3|45.741|7.4144
Rhêmes-Notre-Dame|3|45.5689|7.1182
Rhêmes-Saint-Georges|3|45.6549|7.1554
Roisan|3|45.7846|7.3113
Saint-Christophe|3|45.7474|7.3562
Saint-Denis|3|45.7647|7.5713
Saint-Marcel|3|45.7346|7.4462
Saint-Nicolas|3|45.7161|7.168
Saint-Oyen|3|45.8246|7.2132
Saint-Pierre|3|45.7095|7.2291
Saint-Rhémy-en-Bosses|3|45.8237|7.1822
Saint-Vincent|3|45.7504|7.6479
Sarre|3|45.7168|7.2592
Torgnon|3|45.824|7.5657
Valgrisenche|3|45.6312|7.0647
Valpelline|3|45.8245|7.3242
Valsavarenche|3|45.562|7.2263
Valtournenche|3|45.9116|7.6193
Verrayes|3|45.7693|7.5238
Verrès|3|45.6687|7.6908
Villeneuve|3|45.7024|7.2075
#Veneto
@BL|Belluno
Agordo|3|46.2821|12.035
Alano di Piave|2|45.9078|11.9082
Alleghe|3|46.4066|12.0215
Alpago|1|46.1307|12.3549
Arsiè|2|45.9835|11.7578
Auronzo di Cadore|3|46.5512|12.4432
Belluno|1|46.2805|12.0789
Borca di Cadore|3|46.4364|12.2196
Borgo Valbelluna|1|46.0618|12.0793
Calalzo di Cadore|3|46.4467|12.3804
Canale d'Agordo|3|46.3607|11.9148
Cencenighe Agordino|3|46.3523|11.9673
Cesiomaggiore|2|46.0888|11.9876
Chies d'Alpago|1|46.1653|12.3925
Cibiana di Cadore|2|46.3916|12.2908
Colle Santa Lucia|3|46.447|12.014
Comelico Superiore|3|46.6269|12.4691
Cortina d'Ampezzo|3|46.5383|12.1374
Danta di Cadore|3|46.566|12.5173
Domegge di Cadore|2|46.4604|12.4158
Falcade|3|46.358|11.8721
Feltre|2|46.0164|11.9063
Fonzaso|2|46.0179|11.7998
Gosaldo|2|46.2128|11.9745
La Valle Agordina|2|46.2823|12.0695
Lamon|2|46.0472|11.7486
Limana|1|46.1028|12.1863
Livinallongo del Col di Lana|3|46.5066|11.9368
Longarone|2|46.2658|12.2999
Lorenzago di Cadore|2|46.4796|12.4594
Lozzo di Cadore|3|46.4846|12.4433
Ospitale di Cadore|2|46.3305|12.3229
Pedavena|2|46.0396|11.8804
Perarolo di Cadore|2|46.397|12.3555
Pieve di Cadore|2|46.4287|12.3753
Ponte nelle Alpi|1|46.1618|12.2988
Quero Vas|2|45.9546|11.9132
Rivamonte Agordino|2|46.2519|12.0236
Rocca Pietore|3|46.4339|11.9772
San Gregorio nelle Alpi|2|46.1031|12.0256
San Nicolò di Comelico|3|46.5825|12.5273
San Pietro di Cadore|3|46.5712|12.5861
San Tomaso Agordino|3|46.3885|11.9728
San Vito di Cadore|3|46.459|12.2057
Santa Giustina|2|46.0839|12.0432
Santo Stefano di Cadore|3|46.5579|12.5491
Sedico|2|46.111|12.0972
Selva di Cadore|3|46.4514|12.0345
Seren del Grappa|2|45.9898|11.8449
Sospirolo|2|46.1424|12.0742
Soverzene|2|46.2036|12.3031
Sovramonte|2|46.0568|11.7882
Taibon Agordino|3|46.2988|12.0127
Tambre|1|46.1295|12.4227
Val di Zoldo|2|46.3423|12.1563
Vallada Agordina|3|46.3756|11.937
Valle di Cadore|2|46.4174|12.332
Vigo di Cadore|2|46.5003|12.4725
Vodo Cadore|3|46.42|12.2469
Voltago Agordino|3|46.272|12.0052
Zoppè di Cadore|3|46.3861|12.1739
@PD|Padova
Abano Terme|3|45.3603|11.7898
Agna|3|45.1702|11.9607
Albignasego|3|45.3475|11.8672
Anguillara Veneta|3|45.1394|11.8877
Arquà Petrarca|3|45.27|11.7165
Arre|3|45.2163|11.9305
Arzergrande|3|45.2729|12.0539
Bagnoli di Sopra|3|45.1848|11.8835
Baone|3|45.2439|11.6879
Barbona|3|45.1117|11.6824
Battaglia Terme|3|45.2881|11.7818
Boara Pisani|3|45.1081|11.7827
Borgo Veneto|3|45.2135|11.5414
Borgoricco|3|45.5336|11.9659
Bovolenta|3|45.2704|11.9351
Brugine|3|45.2966|11.9951
Cadoneghe|3|45.4586|11.9202
Campo San Martino|3|45.5444|11.8104
Campodarsego|3|45.5029|11.9075
Campodoro|3|45.4903|11.752
Camposampiero|3|45.5718|11.9319
Candiana|3|45.2211|11.9891
Carceri|3|45.195|11.6208
Carmignano di Brenta|2|45.6288|11.6999
Cartura|3|45.2684|11.8568
Casale di Scodosia|3|45.1875|11.4686
Casalserugo|3|45.3162|11.9135
Castelbaldo|3|45.1212|11.4535
Cervarese Santa Croce|3|45.4244|11.6879
Cinto Euganeo|3|45.2895|11.6724
Cittadella|2|45.6488|11.7836
Codevigo|3|45.2674|12.1013
Conselve|3|45.2337|11.874
Correzzola|3|45.2354|12.0678
Curtarolo|3|45.5223|11.832
Due Carrare|3|45.2905|11.8218
Este|3|45.224|11.6598
Fontaniva|2|45.6376|11.7522
Galliera Veneta|2|45.6628|11.8285
Galzignano Terme|3|45.3068|11.734
Gazzo|3|45.581|11.7065
Grantorto|2|45.6008|11.731
Granze|3|45.1543|11.7135
Legnaro|3|45.3456|11.9639
Limena|3|45.4744|11.8449
Loreggia|2|45.5945|11.9446
Lozzo Atestino|3|45.2909|11.6304
Maserà di Padova|3|45.3207|11.871
Masi|3|45.1088|11.4919
Massanzago|3|45.5555|12.0074
Megliadino San Vitale|3|45.1921|11.5242
Merlara|3|45.1671|11.4419
Mestrino|3|45.4428|11.7583
Monselice|3|45.2418|11.7509
Montagnana|3|45.2333|11.4658
Montegrotto Terme|3|45.3315|11.7912
Noventa Padovana|3|45.4142|11.9508
Ospedaletto Euganeo|3|45.2227|11.6109
Padova|3|45.4077|11.8734
Pernumia|3|45.259|11.7872
Piacenza d'Adige|3|45.1275|11.5477
Piazzola sul Brenta|3|45.5415|11.7844
Piombino Dese|2|45.6075|11.9994
Piove di Sacco|3|45.2977|12.0368
Polverara|3|45.3094|11.956
Ponso|3|45.1951|11.5883
Ponte San Nicolò|3|45.3652|11.9373
Pontelongo|3|45.2455|12.0252
Pozzonovo|3|45.1966|11.7927
Rovolon|3|45.378|11.6444
Rubano|3|45.4287|11.7883
Saccolongo|3|45.4031|11.7476
San Giorgio delle Pertiche|3|45.5417|11.9112
San Giorgio in Bosco|2|45.5919|11.806
San Martino di Lupari|2|45.6487|11.857
San Pietro in Gu|2|45.6141|11.6694
San Pietro Viminario|3|45.2452|11.8186
Sant'Angelo di Piove di Sacco|3|45.3453|12.007
Sant'Elena|3|45.1873|11.712
Sant'Urbano|3|45.133|11.636
Santa Giustina in Colle|3|45.5637|11.9064
Saonara|3|45.3702|11.9841
Selvazzano Dentro|3|45.3898|11.7859
Solesino|3|45.1773|11.7434
Stanghella|3|45.1346|11.756
Teolo|3|45.3654|11.6886
Terrassa Padovana|3|45.2453|11.9034
Tombolo|2|45.647|11.8304
Torreglia|3|45.3357|11.7336
Trebaseleghe|3|45.5918|12.051
Tribano|3|45.21|11.8321
Urbana|3|45.1941|11.4453
Veggiano|3|45.4483|11.7108
Vescovana|3|45.1345|11.7084
Vighizzolo d'Este|3|45.177|11.6256
Vigodarzere|3|45.4582|11.8829
Vigonza|3|45.443|11.9831
Villa del Conte|2|45.5866|11.859
Villa Estense|3|45.1721|11.667
Villafranca Padovana|3|45.4949|11.7975
Villanova di Camposampiero|3|45.4905|11.973
Vo'|3|45.3289|11.6417
@RO|Rovigo
Adria|3|45.0531|12.0572
Ariano nel Polesine|3|44.9461|12.1249
Arquà Polesine|3|45.0104|11.7409
Badia Polesine|3|45.0941|11.4935
Bagnolo di Po|3|45.016|11.5012
Bergantino|3|45.0602|11.2529
Bosaro|3|45.0008|11.7665
Calto|3|44.9915|11.3565
Canaro|3|44.9355|11.6767
Canda|3|45.0344|11.5056
Castelguglielmo|3|45.0252|11.5373
Castelmassa|3|45.0169|11.3105
Castelnovo Bariano|3|45.0278|11.2874
Ceneselli|3|45.0137|11.3692
Ceregnano|3|45.0495|11.8709
Corbola|3|45.0057|12.0785
Costa di Rovigo|3|45.0487|11.6945
Crespino|3|44.9826|11.8862
Ficarolo|3|44.9538|11.4357
Fiesso Umbertiano|3|44.9612|11.6046
Frassinelle Polesine|3|44.9952|11.6988
Fratta Polesine|3|45.0293|11.645
Gaiba|3|44.9462|11.4802
Gavello|3|45.0219|11.9144
Giacciano con Baruchella|3|45.0604|11.4334
Guarda Veneta|3|44.9804|11.8029
Lendinara|3|45.0833|11.6042
Loreo|3|45.062|12.1889
Lusia|3|45.1005|11.6628
Melara|3|45.0632|11.1985
Occhiobello|3|44.9213|11.5814
Papozze|3|44.9882|12.0318
Pettorazza Grimani|3|45.1361|11.9868
Pincara|3|44.9914|11.6088
Polesella|3|44.9641|11.7502
Pontecchio Polesine|3|45.0191|11.8119
Porto Tolle|3|44.9177|12.4022
Porto Viro|3|45.0253|12.2252
Rosolina|3|45.0756|12.2461
Rovigo|3|44.9772|12.2742
Salara|3|44.9825|11.4271
San Bellino|3|45.0296|11.5898
San Martino di Venezze|3|45.1312|11.8685
Stienta|3|44.9378|11.5444
Taglio di Po|3|45.0058|12.2108
Trecenta|3|45.0309|11.4605
Villadose|3|45.0689|11.8937
Villamarzana|3|45.0144|11.6933
Villanova del Ghebbo|3|45.0592|11.639
Villanova Marchesana|3|44.9923|11.9647
@TV|Treviso
Altivole|2|45.754|11.9554
Arcade|2|45.7851|12.2194
Asolo|2|45.8007|11.9142
Borso del Grappa|2|45.821|11.7993
Breda di Piave|2|45.7237|12.3312
Caerano di San Marco|2|45.7859|12.001
Cappella Maggiore|2|45.9695|12.3617
Carbonera|2|45.6848|12.2859
Casale sul Sile|3|45.5978|12.3257
Casier|3|45.6283|12.2652
Castelcucco|2|45.8333|11.884
Castelfranco Veneto|2|45.6728|11.9252
Castello di Godego|2|45.6924|11.881
Cavaso del Tomba|2|45.8584|11.909
Cessalto|3|45.7126|12.6123
Chiarano|3|45.73|12.5813
Cimadolmo|2|45.7871|12.3616
Cison di Valmarino|2|45.97|12.1431
Codognè|2|45.8668|12.4339
Colle Umberto|2|45.941|12.341
Conegliano|2|45.8862|12.2978
Cordignano|2|45.949|12.416
Cornuda|2|45.8317|12.0077
Crocetta del Montello|2|45.834|12.0323
Farra di Soligo|2|45.9054|12.1254
Follina|2|45.9531|12.1181
Fontanelle|2|45.8313|12.4675
Fonte|2|45.7872|11.8675
Fregona|1|46.0002|12.339
Gaiarine|2|45.8805|12.4816
Giavera del Montello|2|45.794|12.1696
Godega di Sant'Urbano|2|45.9298|12.3981
Gorgo al Monticano|3|45.787|12.5504
Istrana|2|45.6786|12.0998
Loria|2|45.7284|11.8656
Mansuè|2|45.8224|12.5377
Mareno di Piave|2|45.8409|12.3513
Maser|2|45.8075|11.9725
Maserada sul Piave|2|45.7494|12.3193
Meduna di Livenza|3|45.8064|12.6127
Miane|2|45.9443|12.0939
Mogliano Veneto|3|45.5613|12.2377
Monastier di Treviso|3|45.6501|12.4338
Monfumo|2|45.8304|11.9211
Montebelluna|2|45.776|12.0451
Morgano|2|45.6434|12.1126
Moriago della Battaglia|2|45.8674|12.1038
Motta di Livenza|3|45.7766|12.6105
Nervesa della Battaglia|2|45.8254|12.2092
Oderzo|2|45.7834|12.4938
Ormelle|2|45.7791|12.4203
Orsago|2|45.9309|12.4236
Paese|2|45.6727|12.1536
Pederobba|2|45.8695|11.9696
Pieve del Grappa|2|45.8272|11.8388
Pieve di Soligo|2|45.8998|12.1731
Ponte di Piave|3|45.7162|12.4652
Ponzano Veneto|2|45.7239|12.1942
Portobuffolè|2|45.8538|12.5383
Possagno|2|45.8549|11.8816
Povegliano|2|45.7592|12.2085
Preganziol|3|45.6025|12.2353
Quinto di Treviso|3|45.642|12.1498
Refrontolo|2|45.9249|12.2078
Resana|2|45.634|11.9553
Revine Lago|1|46.001|12.2255
Riese Pio X|2|45.7292|11.917
Roncade|3|45.6279|12.3748
Salgareda|3|45.7041|12.4926
San Biagio di Callalta|3|45.6849|12.3773
San Fior|2|45.9208|12.3582
San Pietro di Feletto|2|45.9089|12.2406
San Polo di Piave|2|45.7901|12.3948
San Vendemiano|2|45.8907|12.3338
San Zenone degli Ezzelini|2|45.7789|11.8405
Santa Lucia di Piave|2|45.8492|12.2843
Sarmede|2|45.9789|12.3861
Segusino|2|45.9167|11.9539
Sernaglia della Battaglia|2|45.8747|12.1332
Silea|3|45.6534|12.2961
Spresiano|2|45.7804|12.2593
Susegana|2|45.8509|12.25
Tarzo|1|45.9735|12.2316
Trevignano|2|45.7335|12.094
Treviso|2|45.8067|12.2063
Valdobbiadene|2|45.9014|11.9955
Vazzola|2|45.8378|12.3841
Vedelago|2|45.6867|12.018
Vidor|2|45.8616|12.0387
Villorba|2|45.7292|12.2562
Vittorio Veneto|1|45.9897|12.2964
Volpago del Montello|2|45.7781|12.1198
Zenson di Piave|3|45.679|12.4921
Zero Branco|3|45.6017|12.1652
@VE|Venezia
Annone Veneto|3|45.7955|12.6842
Campagna Lupia|3|45.355|12.0968
Campolongo Maggiore|3|45.3305|12.0483
Camponogara|3|45.3851|12.0721
Caorle|3|45.599|12.888
Cavallino-Treporti|3|45.4792|12.5153
Cavarzere|3|45.1361|12.0813
Ceggia|3|45.6864|12.6375
Chioggia|3|45.2189|12.2786
Cinto Caomaggiore|3|45.8259|12.7856
Cona|3|45.1801|12.0787
Concordia Sagittaria|3|45.7561|12.845
Dolo|3|45.425|12.0763
Eraclea|3|45.577|12.6738
Fiesso d'Artico|3|45.4173|12.0332
Fossalta di Piave|3|45.6457|12.5133
Fossalta di Portogruaro|3|45.7917|12.909
Fossò|3|45.3856|12.0486
Gruaro|3|45.8335|12.8437
Jesolo|3|45.5367|12.6383
Marcon|3|45.5543|12.2994
Martellago|3|45.5466|12.1577
Meolo|3|45.6194|12.4531
Mira|3|45.4378|12.1328
Mirano|3|45.4928|12.1099
Musile di Piave|3|45.6174|12.5619
Noale|3|45.5501|12.0721
Noventa di Piave|3|45.6619|12.5299
Pianiga|3|45.4561|12.0302
Portogruaro|3|45.7756|12.8375
Pramaggiore|3|45.8146|12.7388
Quarto d'Altino|3|45.5805|12.3705
Salzano|3|45.5213|12.1064
San Donà di Piave|3|45.6295|12.5641
San Michele al Tagliamento|3|45.7639|12.9954
San Stino di Livenza|3|45.7311|12.68
Santa Maria di Sala|3|45.505|12.0339
Scorzè|3|45.5714|12.1084
Spinea|3|45.4912|12.165
Stra|3|45.4168|12.0023
Teglio Veneto|3|45.8175|12.885
Torre di Mosto|3|45.6905|12.7104
Venezia|3|45.4372|12.3346
Vigonovo|3|45.387|12.0075
@VR|Verona
Affi|2|45.5541|10.7764
Albaredo d'Adige|3|45.317|11.2745
Angiari|3|45.2181|11.2839
Arcole|3|45.3582|11.2861
Badia Calavena|2|45.5661|11.1524
Bardolino|2|45.5476|10.7242
Belfiore|3|45.3796|11.209
Bevilacqua|3|45.2318|11.3925
Bonavigo|3|45.2576|11.2793
Boschi Sant'Anna|3|45.2189|11.3583
Bosco Chiesanuova|2|45.6221|11.0295
Bovolone|3|45.2578|11.1204
Brentino Belluno|2|45.6679|10.8814
Brenzone sul Garda|2|45.6929|10.772
Bussolengo|2|45.4741|10.8462
Buttapietra|3|45.3421|10.9986
Caldiero|2|45.4144|11.1774
Caprino Veronese|2|45.6059|10.7951
Casaleone|3|45.1707|11.1994
Castagnaro|3|45.1208|11.4108
Castel d'Azzano|3|45.3559|10.953
Castelnuovo del Garda|2|45.4384|10.7605
Cavaion Veronese|2|45.5403|10.7702
Cazzano di Tramigna|2|45.4731|11.2029
Cerea|3|45.192|11.2129
Cerro Veronese|2|45.5753|11.0411
Cologna Veneta|3|45.3103|11.3844
Colognola ai Colli|2|45.4346|11.1867
Concamarise|3|45.2073|11.1385
Costermano sul Garda|2|45.5857|10.74
Dolcè|2|45.6007|10.8525
Erbè|3|45.2409|10.9685
Erbezzo|2|45.6398|11.0014
Ferrara di Monte Baldo|2|45.6769|10.8543
Fumane|2|45.543|10.884
Garda|2|45.5757|10.7085
Gazzo Veronese|3|45.1303|11.0961
Grezzana|2|45.5185|11.0162
Illasi|2|45.4659|11.18
Isola della Scala|3|45.2731|11.0069
Isola Rizza|3|45.2912|11.1982
Lavagno|2|45.4474|11.1349
Lazise|2|45.5052|10.733
Legnago|3|45.1925|11.3111
Malcesine|2|45.7643|10.8101
Marano di Valpolicella|2|45.556|10.9157
Mezzane di Sotto|2|45.482|11.1282
Minerbe|3|45.2409|11.3348
Montecchia di Crosara|2|45.4845|11.2534
Monteforte d'Alpone|2|45.4173|11.2837
Mozzecane|3|45.31|10.8185
Negrar di Valpolicella|2|45.5297|10.94
Nogara|3|45.179|11.0637
Nogarole Rocca|3|45.2919|10.8838
Oppeano|3|45.3062|11.1823
Palù|3|45.3258|11.1552
Pastrengo|2|45.4925|10.7997
Pescantina|2|45.4834|10.8691
Peschiera del Garda|2|45.4389|10.692
Povegliano Veronese|3|45.3484|10.8824
Pressana|3|45.2847|11.4021
Rivoli Veronese|2|45.572|10.8118
Roncà|2|45.4789|11.2889
Ronco all'Adige|3|45.3378|11.2425
Roverchiara|3|45.2723|11.2478
Roverè Veronese|2|45.5933|11.0657
Roveredo di Guà|3|45.2738|11.445
Salizzole|3|45.2428|11.0844
San Bonifacio|3|45.3956|11.2701
San Giovanni Ilarione|2|45.5241|11.2349
San Giovanni Lupatoto|2|45.382|11.0449
San Martino Buon Albergo|2|45.4217|11.0969
San Mauro di Saline|2|45.5658|11.1144
San Pietro di Morubio|3|45.243|11.2282
San Pietro in Cariano|2|45.5209|10.8864
San Zeno di Montagna|2|45.6314|10.7254
Sanguinetto|3|45.1845|11.1511
Sant'Ambrogio di Valpolicella|2|45.5221|10.8344
Sant'Anna d'Alfaedo|2|45.6275|10.9515
Selva di Progno|2|45.6114|11.1386
Soave|2|45.4202|11.2477
Sommacampagna|2|45.4078|10.8409
Sona|2|45.4334|10.8327
Sorgà|3|45.2134|10.9794
Terrazzo|3|45.1733|11.3986
Torri del Benaco|2|45.6094|10.6874
Tregnago|2|45.514|11.1656
Trevenzuolo|3|45.2686|10.9322
Valeggio sul Mincio|2|45.3538|10.7345
Velo Veronese|2|45.6052|11.0957
Verona|2|45.4385|10.9924
Veronella|3|45.325|11.3223
Vestenanova|2|45.5735|11.2277
Vigasio|3|45.317|10.9422
Villa Bartolomea|3|45.1587|11.3534
Villafranca di Verona|2|45.3509|10.846
Zevio|3|45.3751|11.1359
Zimella|3|45.3436|11.3523
@VI|Vicenza
Agugliaro|3|45.3254|11.5842
Albettone|3|45.3582|11.5815
Alonte|3|45.365|11.4274
Altavilla Vicentina|3|45.5084|11.4707
Altissimo|2|45.6147|11.2513
Arcugnano|3|45.5005|11.5357
Arsiero|3|45.8035|11.3504
Arzignano|2|45.5193|11.3386
Asiago|2|45.8754|11.5107
Asigliano Veneto|3|45.3045|11.4463
Barbarano Mossano|3|45.4083|11.5677
Bassano del Grappa|2|45.7669|11.7343
Bolzano Vicentino|2|45.6007|11.6221
Breganze|2|45.7081|11.5648
Brendola|3|45.4721|11.447
Bressanvido|2|45.646|11.633
Brogliano|2|45.5888|11.3645
Caldogno|2|45.6118|11.5076
Caltrano|2|45.7706|11.4608
Calvene|2|45.7668|11.513
Camisano Vicentino|3|45.522|11.7133
Campiglia dei Berici|3|45.3362|11.5395
Carrè|2|45.7484|11.4593
Cartigliano|2|45.7131|11.6941
Cassola|2|45.7324|11.7943
Castegnero|3|45.4425|11.5844
Castelgomberto|2|45.5853|11.3945
Chiampo|2|45.5446|11.2809
Chiuppano|2|45.7622|11.4651
Cogollo del Cengio|2|45.7852|11.4261
Colceresa|2|45.7181|11.607
Cornedo Vicentino|2|45.6111|11.3434
Costabissara|2|45.5855|11.4877
Creazzo|2|45.5321|11.4786
Crespadoro|2|45.6202|11.2259
Dueville|2|45.6355|11.5486
Enego|2|45.9405|11.7096
Fara Vicentino|2|45.7396|11.5483
Foza|2|45.8963|11.6307
Gallio|2|45.8926|11.5471
Gambellara|2|45.4625|11.3398
Gambugliano|2|45.5889|11.44
Grisignano di Zocco|3|45.4753|11.6989
Grumolo delle Abbadesse|3|45.5163|11.6587
Isola Vicentina|2|45.6287|11.4431
Laghi|3|45.8244|11.2723
Lastebasse|3|45.9151|11.2739
Longare|3|45.4746|11.611
Lonigo|3|45.3881|11.388
Lugo di Vicenza|2|45.7514|11.5229
Lusiana Conco|2|45.8081|11.5879
Malo|2|45.6603|11.4075
Marano Vicentino|2|45.6925|11.4288
Marostica|2|45.7454|11.6569
Monte di Malo|2|45.6605|11.3626
Montebello Vicentino|2|45.4572|11.3854
Montecchio Maggiore|2|45.5051|11.4084
Montecchio Precalcino|2|45.6658|11.5633
Montegalda|3|45.4438|11.6732
Montegaldella|3|45.4364|11.6708
Monteviale|2|45.5605|11.4581
Monticello Conte Otto|2|45.5952|11.5806
Montorso Vicentino|2|45.4898|11.3623
Mussolente|2|45.779|11.8013
Nanto|3|45.422|11.605
Nogarole Vicentino|2|45.5594|11.2884
Nove|2|45.7257|11.6801
Noventa Vicentina|3|45.2906|11.5399
Orgiano|3|45.351|11.466
Pedemonte|3|45.5032|10.9187
Pianezze|2|45.74|11.6267
Piovene Rocchette|2|45.7588|11.4301
Pojana Maggiore|3|45.2914|11.5013
Posina|2|45.7911|11.2625
Pove del Grappa|2|45.7991|11.7291
Pozzoleone|2|45.649|11.6791
Quinto Vicentino|2|45.5738|11.6277
Recoaro Terme|2|45.7052|11.2249
Roana|2|45.8756|11.4627
Romano d'Ezzelino|2|45.7962|11.7584
Rosà|2|45.7244|11.7627
Rossano Veneto|2|45.7053|11.7998
Rotzo|3|45.8635|11.3994
Salcedo|2|45.7588|11.565
San Pietro Mussolino|2|45.5863|11.2561
San Vito di Leguzzano|2|45.6816|11.3763
Sandrigo|2|45.6606|11.6029
Santorso|2|45.7373|11.3903
Sarcedo|2|45.7079|11.526
Sarego|3|45.4081|11.4056
Schiavon|2|45.6977|11.6443
Schio|2|45.7114|11.3554
Solagna|2|45.8167|11.7182
Sossano|3|45.3588|11.51
Sovizzo|2|45.528|11.4456
Tezze sul Brenta|2|45.6862|11.7042
Thiene|2|45.7058|11.4803
Tonezza del Cimone|3|45.8572|11.346
Torrebelvicino|2|45.7189|11.3088
Torri di Quartesolo|3|45.5193|11.6171
Trissino|2|45.564|11.3749
Val Liona|3|45.4102|11.4721
Valbrenta|2|45.8814|11.7018
Valdagno|2|45.6413|11.3041
Valdastico|3|45.8824|11.3446
Valli del Pasubio|2|45.7408|11.2622
Velo d'Astico|2|45.7884|11.3677
Vicenza|2|45.6349|11.4064
Villaga|3|45.4025|11.5337
Villaverla|2|45.6512|11.4941
Zanè|2|45.7201|11.4608
Zermeghedo|2|45.475|11.3695
Zovencedo|3|45.4285|11.5032
Zugliano|2|45.734|11.5247`;

/** Da "2A", "3S", "2B-3A" alla zona canonica (la più severa fra quelle citate). */
function zonaCanonica(label: string): ZonaSismica {
  const numeri = label.match(/[1-4]/g)?.map(Number) ?? [4];
  return Math.min(...numeri) as ZonaSismica;
}

function leggi(): Comune[] {
  const out: Comune[] = [];
  let regione = '';
  let provincia = '';
  let sigla = '';
  for (const riga of DATI.split('\n')) {
    if (!riga) continue;
    if (riga[0] === '#') {
      regione = riga.slice(1);
    } else if (riga[0] === '@') {
      const [s, nome] = riga.slice(1).split('|');
      sigla = s;
      provincia = nome;
    } else {
      const [nome, zonaLabel, lat, lon] = riga.split('|');
      out.push({
        nome,
        provincia,
        sigla,
        regione,
        zona: zonaCanonica(zonaLabel),
        zonaLabel,
        lat: +lat,
        lon: +lon,
        indice: out.length,
      });
    }
  }
  return out;
}

/** Tutti i comuni, ordinati per regione, provincia e nome. */
export const COMUNI: Comune[] = leggi();

/** Regioni in ordine alfabetico. */
export const REGIONI: string[] = [...new Set(COMUNI.map((c) => c.regione))];

/** Province (sigla + nome esteso) di una regione, in ordine alfabetico. */
export function provinceDi(regione: string): { sigla: string; nome: string }[] {
  const viste = new Map<string, string>();
  for (const c of COMUNI) if (c.regione === regione) viste.set(c.sigla, c.provincia);
  return [...viste].map(([sigla, nome]) => ({ sigla, nome }));
}

/** Comuni di una provincia, in ordine alfabetico. */
export function comuniDi(regione: string, sigla: string): Comune[] {
  return COMUNI.filter((c) => c.regione === regione && c.sigla === sigla);
}

/** Comune per regione + sigla provincia + nome; undefined se non esiste. */
export function trovaComune(regione: string, sigla: string, nome: string): Comune | undefined {
  return COMUNI.find((c) => c.regione === regione && c.sigla === sigla && c.nome === nome);
}
