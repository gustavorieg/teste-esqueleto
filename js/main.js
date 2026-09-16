/* Cena, interação (seleção/hover/foco) e painel lateral */
(async () => {
  const $ = id => document.getElementById(id);

  const DESC = {
    frontal: 'Forma a testa e o teto das órbitas; protege os lobos frontais do encéfalo.',
    parietal: 'Par de ossos que forma o teto e as laterais do crânio, unidos na sutura sagital.',
    occipital: 'Forma a parte posterior e a base do crânio; contém o forame magno, por onde passa a medula espinhal.',
    temporal: 'Forma a lateral e parte da base do crânio; abriga as estruturas da audição e articula-se com a mandíbula.',
    esfenoide: 'Osso em forma de borboleta no centro da base do crânio; contém a sela túrcica, que aloja a hipófise.',
    etmoide: 'Osso leve e poroso entre as órbitas; forma parte da cavidade nasal e do teto do nariz.',
    vomer: 'Osso fino e plano que forma a parte inferior do septo nasal.',
    zigomatico: 'Osso da "maçã do rosto"; forma a proeminência da bochecha e parte da órbita.',
    lacrimal: 'O menor osso da face, na parede medial da órbita; contém o sulco do saco lacrimal.',
    nasal: 'Par de pequenos ossos que formam a ponte do nariz.',
    maxila: 'Forma o maxilar superior, parte do palato e das órbitas; sustenta os dentes superiores.',
    palatino: 'Forma a parte posterior do palato duro e parte da cavidade nasal.',
    concha: 'Lâmina óssea curva na parede lateral da cavidade nasal; aquece e umidifica o ar inspirado.',
    dentes: 'O adulto tem 32 dentes permanentes (incisivos, caninos, pré-molares e molares). Não são ossos, mas fazem parte do esqueleto da face.',
    cartilagem: 'Cartilagem costal: une as costelas ao esterno e dá elasticidade à caixa torácica durante a respiração.',
    mandibula: 'Único osso móvel da cabeça; articula-se com o osso temporal (ATM) e sustenta os dentes inferiores.',
    hioide: 'Osso em forma de U no pescoço que não se articula com nenhum outro osso; dá suporte à língua.',
    cervical: 'Uma das 7 vértebras do pescoço. O atlas (C1) sustenta o crânio e o áxis (C2) permite a rotação da cabeça.',
    toracica: 'Uma das 12 vértebras torácicas, que se articulam com as costelas.',
    lombar: 'Uma das 5 vértebras lombares, as maiores da coluna, que suportam boa parte do peso do corpo.',
    sacro: 'Formado por 5 vértebras fundidas; une a coluna vertebral à pelve.',
    coccix: 'Pequeno osso formado por 3 a 5 vértebras rudimentares fundidas, no final da coluna.',
    esterno: 'Osso plano no centro do tórax, composto por manúbrio, corpo e processo xifoide.',
    'costela-verdadeira': 'Costela verdadeira (1ª a 7ª): liga-se diretamente ao esterno por sua própria cartilagem costal.',
    'costela-falsa': 'Costela falsa (8ª a 10ª): sua cartilagem une-se à cartilagem da costela acima, não diretamente ao esterno.',
    'costela-flutuante': 'Costela flutuante (11ª e 12ª): não se liga ao esterno e termina livre na parede abdominal.',
    clavicula: 'Osso longo em forma de S que liga o esterno à escápula.',
    escapula: 'Osso plano e triangular (omoplata) na parte posterior do tórax; forma parte da articulação do ombro.',
    umero: 'Osso do braço; articula-se com a escápula no ombro e com o rádio e a ulna no cotovelo.',
    radio: 'Osso lateral do antebraço (lado do polegar); gira em torno da ulna na pronação e supinação.',
    ulna: 'Osso medial do antebraço (lado do dedo mínimo); forma o olécrano, a ponta do cotovelo.',
    carpo: 'Um dos 8 ossos do carpo (punho), dispostos em duas fileiras.',
    metacarpal: 'Um dos 5 ossos metacarpais, que formam a palma da mão.',
    'falange-mao': 'Falange dos dedos da mão. O polegar tem 2 falanges; os demais dedos têm 3.',
    coxal: 'Formado pela fusão de ílio, ísquio e púbis; contém o acetábulo, onde se encaixa a cabeça do fêmur.',
    femur: 'O maior e mais resistente osso do corpo humano; participa do quadril e do joelho.',
    patela: 'Osso sesamoide (rótula) na frente do joelho, dentro do tendão do quadríceps.',
    tibia: 'Osso medial e principal da perna; suporta o peso do corpo e forma o maléolo medial.',
    fibula: 'Osso lateral e fino da perna (perônio); forma o maléolo lateral do tornozelo.',
    tarso: 'Um dos 7 ossos do tarso, que formam o tornozelo e a parte posterior do pé.',
    metatarsal: 'Um dos 5 ossos metatarsais, que formam a parte média do pé.',
    'falange-pe': 'Falange dos dedos do pé. O hálux tem 2 falanges; os demais dedos têm 3.',
  };
  const REGIONS = ['Cabeça', 'Coluna vertebral', 'Tórax', 'Cintura escapular', 'Membro superior', 'Mão', 'Pelve', 'Membro inferior', 'Pé'];

  /* ---------------- CENA ---------------- */
  const viewer = $('viewer');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  viewer.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 1, 3000);
  const HOME_POS = new THREE.Vector3(0, 95, 290);
  const HOME_TARGET = new THREE.Vector3(0, 84, 0);
  camera.position.copy(HOME_POS);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.copy(HOME_TARGET);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 12;
  controls.maxDistance = 800;
  controls.autoRotateSpeed = 2.5;

  // Iluminação: ambiente suave (reflexos) + luz principal que acompanha a câmera, com sombras
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x3a3028, 0.3));

  const key = new THREE.DirectionalLight(0xfff1dc, 1.45);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.06;
  Object.assign(key.shadow.camera, { near: 1, far: 900 });
  const KEY_DIR = new THREE.Vector3(0.75, 0.85, 0.3).normalize();   // direita, acima e um pouco à frente (espaço da câmera)

  const rim = new THREE.DirectionalLight(0xc7d6ff, 0.45);
  rim.position.set(-140, 90, -160);
  scene.add(key, key.target, rim);

  function updateKeyLight() {
    key.target.position.copy(controls.target);
    key.position.copy(KEY_DIR).applyQuaternion(camera.quaternion).multiplyScalar(350).add(controls.target);
    const size = THREE.MathUtils.clamp(camera.position.distanceTo(controls.target) * 0.42, 12, 105);
    const cam = key.shadow.camera;
    if (Math.abs(cam.right - size) > 0.5) {
      Object.assign(cam, { left: -size, right: size, top: size, bottom: -size });
      cam.updateProjectionMatrix();
    }
  }

  // Sombra suave no chão
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const ctx = cv.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(120,150,200,0.35)');
  grad.addColorStop(1, 'rgba(120,150,200,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const glowTex = new THREE.CanvasTexture(cv);
  glowTex.encoding = THREE.sRGBEncoding;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(70, 48),
    new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, toneMapped: false }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.1;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.3 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(floor, ground, SK.root);

  /* ---------------- MATERIAIS POR ESTADO ---------------- */
  const MATS = {};
  for (const [kind, base] of Object.entries(SK.MAT)) {
    const hover = SK.decorate(base.clone());
    hover.emissive.set(0x503820);
    const faded = SK.decorate(base.clone());
    Object.assign(faded, { transparent: true, opacity: 0.1, depthWrite: false });
    const selected = SK.decorate(base.clone());
    selected.color.set(kind === 'cartilage' ? 0xffc6a8 : 0xff8f5a);
    selected.emissive.set(0x3c1200);
    MATS[kind] = { normal: base, hover, faded, selected };
  }

  try {
    await SK.ready;
  } catch (err) {
    $('loading').textContent = 'Não foi possível carregar o modelo 3D (use um navegador atualizado).';
    throw err;
  }
  $('loading').hidden = true;

  /* ---------------- ESTADO ---------------- */
  const selection = new Set();      // ossos selecionados (1 ou vários)
  let hovered = null;
  let isolated = false;
  let fadeOthers = true;
  let multiMode = false;            // checkbox "selecionar vários"; Ctrl/Cmd+clique funciona sempre

  function applyMaterials() {
    for (const b of SK.bones) {
      let state = 'normal';
      if (selection.has(b)) state = 'selected';
      else if (b === hovered) state = 'hover';
      else if (selection.size && fadeOthers) state = 'faded';
      b.visible = !(isolated && selection.size && !selection.has(b));
      b.traverse(o => {
        if (!o.isMesh) return;
        o.material = MATS[o.userData.kind][state];
        o.castShadow = state !== 'faded';
      });
    }
  }

  function clearSelection() {
    selection.clear();
    isolated = false;
    applyMaterials();
    updatePanel();
  }

  function selectOnly(bone, focus = false) {
    selection.clear();
    if (bone) selection.add(bone);
    else isolated = false;
    applyMaterials();
    updatePanel();
    if (bone && focus) focusOnSelection();
  }

  function toggleSelect(bone) {
    if (!bone) return;
    if (selection.has(bone)) selection.delete(bone);
    else selection.add(bone);
    if (selection.size === 0) isolated = false;
    applyMaterials();
    updatePanel();
  }

  /* ---------------- CÂMERA ANIMADA ---------------- */
  let anim = null;
  function flyTo(target, camPos) {
    anim = { t: 0, fromT: controls.target.clone(), toT: target, fromP: camera.position.clone(), toP: camPos };
  }
  function focusOnSelection() {
    if (!selection.size) return;
    const box = new THREE.Box3();
    for (const b of selection) box.union(new THREE.Box3().setFromObject(b));
    const center = box.getCenter(new THREE.Vector3());
    const dist = Math.max(box.getSize(new THREE.Vector3()).length() * 2.4, 14);
    const dir = camera.position.clone().sub(controls.target).normalize();
    flyTo(center, center.clone().addScaledVector(dir, dist));
  }

  /* ---------------- PICKING ---------------- */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function pick(x, y) {
    ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    for (const hit of raycaster.intersectObject(SK.root, true)) {
      let o = hit.object;
      while (o && !o.userData.isBone) o = o.parent;
      if (o && o.visible) return o;
    }
    return null;
  }

  const tooltip = $('tooltip');
  let downPos = null;
  let moveEvt = null;

  renderer.domElement.addEventListener('pointerdown', e => { downPos = { x: e.clientX, y: e.clientY }; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (downPos && Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) < 5) {
      const bone = pick(e.clientX, e.clientY);
      if (!bone) clearSelection();
      else if (multiMode || e.ctrlKey || e.metaKey) toggleSelect(bone);
      else selectOnly(bone, false);
    }
    downPos = null;
  });
  renderer.domElement.addEventListener('dblclick', () => focusOnSelection());
  renderer.domElement.addEventListener('pointermove', e => { moveEvt = e; });
  renderer.domElement.addEventListener('pointerleave', () => { moveEvt = null; setHover(null); });

  function setHover(bone, e) {
    if (bone !== hovered) {
      hovered = bone;
      applyMaterials();
      renderer.domElement.style.cursor = bone ? 'pointer' : 'grab';
    }
    tooltip.hidden = !bone;
    if (bone) {
      tooltip.textContent = bone.userData.name;
      tooltip.style.left = e.clientX + 'px';
      tooltip.style.top = e.clientY + 'px';
    }
  }

  /* ---------------- PAINEL ---------------- */
  $('bone-count').textContent = SK.bones.filter(b => b.userData.kind === 'bone' && b.userData.type !== 'dentes').length;
  const listEl = $('bone-list');
  const sortKey = name => name
    .replace(/^Atlas \(C1\)/, 'Vértebra 1 C1').replace(/^Áxis \(C2\)/, 'Vértebra 1 C2')
    .replace(/^Vértebra cervical/, 'Vértebra 1').replace(/^Vértebra torácica/, 'Vértebra 2')
    .replace(/^Vértebra lombar/, 'Vértebra 3').replace(/^Sacro/, 'Vértebra 4').replace(/^Cóccix/, 'Vértebra 5')
    .replace(/^Esterno/, '0');
  const items = new Map();
  const groups = {};

  for (const region of REGIONS) {
    const det = document.createElement('details');
    const sum = document.createElement('summary');
    const regionBones = SK.bones.filter(b => b.userData.region === region)
      .sort((a, b) => sortKey(a.userData.name).localeCompare(sortKey(b.userData.name), 'pt', { numeric: true }));
    sum.textContent = `${region} (${regionBones.length})`;
    det.appendChild(sum);
    for (const b of regionBones) {
      const it = document.createElement('div');
      it.className = 'item';
      it.textContent = b.userData.name;
      it.addEventListener('click', e => {
        if (multiMode || e.ctrlKey || e.metaKey) toggleSelect(b);
        else selectOnly(b, true);
      });
      det.appendChild(it);
      items.set(b, it);
    }
    listEl.appendChild(det);
    groups[region] = det;
  }

  function updatePanel() {
    const n = selection.size;
    $('info-empty').hidden = n > 0;
    $('info-bone').hidden = n === 0;
    $('info-single').hidden = n !== 1;
    $('info-multi').hidden = n <= 1;
    items.forEach((it, b) => it.classList.toggle('selected', selection.has(b)));
    $('btn-isolate').classList.toggle('active', isolated);
    $('btn-isolate').textContent = isolated ? 'Mostrar todos' : 'Isolar';

    if (n === 1) {
      const [bone] = selection;
      const { name, region, type } = bone.userData;
      $('info-name').textContent = name;
      $('info-region').textContent = region;
      $('info-desc').textContent = DESC[type] || '';
      groups[region].open = true;
      items.get(bone).scrollIntoView({ block: 'nearest' });
    } else if (n > 1) {
      $('multi-count').textContent = n;
      const chips = $('multi-chips');
      chips.innerHTML = '';
      for (const b of selection) {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = b.userData.name;
        const x = document.createElement('button');
        x.className = 'chip-x';
        x.textContent = '×';
        x.title = 'Remover da seleção';
        x.addEventListener('click', ev => { ev.stopPropagation(); toggleSelect(b); });
        chip.appendChild(x);
        chips.appendChild(chip);
      }
    }
  }

  /* ---------------- GRUPOS SALVOS (localStorage) ---------------- */
  const GROUPS_KEY = 'esqueleto-grupos-v1';
  function loadGroups() {
    try { return JSON.parse(localStorage.getItem(GROUPS_KEY)) || []; }
    catch { return []; }
  }
  function persistGroups() {
    try { localStorage.setItem(GROUPS_KEY, JSON.stringify(savedGroups)); }
    catch { /* localStorage indisponível (ex: aba privada) — grupo fica só na sessão atual */ }
  }
  let savedGroups = loadGroups();
  const groupsListEl = $('groups-list');

  function renderGroups() {
    groupsListEl.innerHTML = '';
    if (!savedGroups.length) {
      const empty = document.createElement('div');
      empty.className = 'groups-empty';
      empty.textContent = 'Nenhum grupo salvo. Selecione 2+ ossos e clique em "Salvar grupo".';
      groupsListEl.appendChild(empty);
      return;
    }
    for (const g of savedGroups) {
      const row = document.createElement('div');
      row.className = 'group-row';
      const label = document.createElement('span');
      label.className = 'group-name';
      label.textContent = `${g.name} (${g.boneIds.length})`;
      label.title = 'Clique para selecionar este grupo';
      label.addEventListener('click', () => selectGroup(g));
      const del = document.createElement('button');
      del.className = 'group-del';
      del.textContent = '🗑';
      del.title = 'Excluir grupo';
      del.addEventListener('click', ev => {
        ev.stopPropagation();
        savedGroups = savedGroups.filter(x => x.id !== g.id);
        persistGroups();
        renderGroups();
      });
      row.append(label, del);
      groupsListEl.appendChild(row);
    }
  }

  function selectGroup(g) {
    selection.clear();
    for (const id of g.boneIds) {
      const b = SK.bones.find(x => x.userData.id === id);
      if (b) selection.add(b);
    }
    isolated = false;
    applyMaterials();
    updatePanel();
    focusOnSelection();
  }

  $('btn-group-save').addEventListener('click', () => {
    if (selection.size < 2) return;
    const input = $('group-name');
    const name = input.value.trim() || `Grupo (${selection.size} ossos)`;
    savedGroups.push({ id: 'g' + Date.now(), name, boneIds: [...selection].map(b => b.userData.id) });
    persistGroups();
    renderGroups();
    input.value = '';
  });
  $('group-name').addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-group-save').click(); });
  renderGroups();

  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  $('search').addEventListener('input', e => {
    const q = norm(e.target.value.trim());
    for (const region of REGIONS) {
      let count = 0;
      for (const it of groups[region].querySelectorAll('.item')) {
        const ok = !q || norm(it.textContent).includes(q);
        it.hidden = !ok;
        count += ok;
      }
      groups[region].hidden = count === 0;
      groups[region].open = !!q && count > 0;
    }
  });

  $('btn-focus').addEventListener('click', () => focusOnSelection());
  $('btn-isolate').addEventListener('click', () => {
    isolated = !isolated;
    applyMaterials();
    updatePanel();
    if (isolated) focusOnSelection();
  });
  $('btn-clear').addEventListener('click', () => clearSelection());
  $('btn-reset').addEventListener('click', () => flyTo(HOME_TARGET.clone(), HOME_POS.clone()));
  $('chk-fade').addEventListener('change', e => { fadeOthers = e.target.checked; applyMaterials(); });
  $('chk-rotate').addEventListener('change', e => { controls.autoRotate = e.target.checked; });
  $('chk-multi').addEventListener('change', e => { multiMode = e.target.checked; });
  addEventListener('keydown', e => { if (e.key === 'Escape') clearSelection(); });

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  /* ---------------- LOOP ---------------- */
  const clock = new THREE.Clock();
  applyMaterials();
  renderer.domElement.style.cursor = 'grab';

  (function loop() {
    requestAnimationFrame(loop);
    const dt = clock.getDelta();

    if (anim) {
      anim.t = Math.min(1, anim.t + dt * 1.8);
      const k = 1 - Math.pow(1 - anim.t, 3);
      controls.target.lerpVectors(anim.fromT, anim.toT, k);
      camera.position.lerpVectors(anim.fromP, anim.toP, k);
      if (anim.t >= 1) anim = null;
    }

    if (moveEvt && !downPos) {
      setHover(pick(moveEvt.clientX, moveEvt.clientY), moveEvt);
      moveEvt = null;
    }

    controls.update();
    updateKeyLight();
    renderer.render(scene, camera);
  })();
})();
