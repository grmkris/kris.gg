import {
	r as _,
	j as e,
	L as H,
	c as a,
	a as z,
	b as M,
	R as A,
	d as C,
	T as f,
	C as u,
	u as P,
} from "./index-8Z9x6Lxe.js";
class L {
	constructor(s) {
		(this.container = s),
			(this.cards = Array.from(this.container.children)),
			(this.mouse = { x: 0, y: 0 }),
			(this.containerSize = { w: 0, h: 0 }),
			(this.initContainer = this.initContainer.bind(this)),
			(this.onMouseMove = this.onMouseMove.bind(this)),
			this.init();
	}
	initContainer() {
		(this.containerSize.w = this.container.offsetWidth),
			(this.containerSize.h = this.container.offsetHeight);
	}
	onMouseMove(s) {
		const { clientX: r, clientY: l } = s,
			i = this.container.getBoundingClientRect(),
			{ w: j, h: y } = this.containerSize,
			c = r - i.left,
			d = l - i.top;
		c < j &&
			c > 0 &&
			d < y &&
			d > 0 &&
			((this.mouse.x = c),
			(this.mouse.y = d),
			this.cards.forEach((o) => {
				const w = -(o.getBoundingClientRect().left - i.left) + this.mouse.x,
					N = -(o.getBoundingClientRect().top - i.top) + this.mouse.y;
				o.style.setProperty("--mouse-x", `${w}px`),
					o.style.setProperty("--mouse-y", `${N}px`);
			}));
	}
	init() {
		this.initContainer(),
			window.addEventListener("resize", this.initContainer),
			window.addEventListener("mousemove", this.onMouseMove);
	}
}
const k = () => (
	_.useEffect(() => {
		document.querySelectorAll("[data-spotlight]").forEach((s) => {
			new L(s);
		});
	}, []),
	e.jsxs("div", {
		className:
			"max-w-sm mx-auto grid gap-6 lg:grid-cols-3 items-start lg:max-w-none group",
		"data-spotlight": !0,
		children: [
			e.jsx("div", {
				className:
					"relative h-full bg-slate-800 rounded-3xl p-px before:absolute before:w-80 before:h-80 before:-left-40 before:-top-40 before:bg-slate-400 before:rounded-full before:opacity-0 before:pointer-events-none before:transition-opacity before:duration-500 before:translate-x-[var(--mouse-x)] before:translate-y-[var(--mouse-y)] before:group-hover:opacity-100 before:z-10 before:blur-[100px] after:absolute after:w-96 after:h-96 after:-left-48 after:-top-48 after:bg-indigo-500 after:rounded-full after:opacity-0 after:pointer-events-none after:transition-opacity after:duration-500 after:translate-x-[var(--mouse-x)] after:translate-y-[var(--mouse-y)] after:hover:opacity-10 after:z-30 after:blur-[100px] overflow-hidden",
				children: e.jsxs("div", {
					className:
						"relative h-full bg-slate-900 p-6 pb-8 rounded-[inherit] z-20 overflow-hidden",
					children: [
						e.jsx("div", {
							className:
								"absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 pointer-events-none -z-10 w-1/2 aspect-square",
							"aria-hidden": "true",
							children: e.jsx("div", {
								className:
									"absolute inset-0 translate-z-0 bg-slate-800 rounded-full blur-[80px]",
							}),
						}),
						e.jsxs("div", {
							className: "flex flex-col h-full items-center text-center",
							children: [
								e.jsxs("div", {
									className: "relative inline-flex",
									children: [
										e.jsx("div", {
											className:
												"w-[40%] h-[40%] absolute inset-0 m-auto -translate-y-[10%] blur-3xl -z-10 rounded-full bg-indigo-600",
											"aria-hidden": "true",
										}),
										e.jsx("img", {
											className: "inline-flex",
											src: "card-01.png",
											width: "200",
											height: "200",
											alt: "Card 01",
										}),
									],
								}),
								e.jsxs("div", {
									className: "grow mb-5",
									children: [
										e.jsx("h2", {
											className: "text-xl text-slate-200 font-bold mb-1",
											children: "Amazing Integration",
										}),
										e.jsx("p", {
											className: "text-sm text-slate-500",
											children:
												"Quickly apply filters to refine your issues lists and create custom views.",
										}),
									],
								}),
								e.jsxs("a", {
									className:
										"inline-flex justify-center items-center whitespace-nowrap rounded-lg bg-slate-800 hover:bg-slate-900 border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 focus-visible:outline-none focus-visible:ring focus-visible:ring-indigo-300 dark:focus-visible:ring-slate-600 transition-colors duration-150",
									href: "#0",
									children: [
										e.jsx("svg", {
											className: "fill-slate-500 mr-2",
											xmlns: "http://www.w3.org/2000/svg",
											width: "16",
											height: "14",
											children: e.jsx("path", {
												d: "M12.82 8.116A.5.5 0 0 0 12 8.5V10h-.185a3 3 0 0 1-2.258-1.025l-.4-.457-1.328 1.519.223.255A5 5 0 0 0 11.815 12H12v1.5a.5.5 0 0 0 .82.384l3-2.5a.5.5 0 0 0 0-.768l-3-2.5ZM12.82.116A.5.5 0 0 0 12 .5V2h-.185a5 5 0 0 0-3.763 1.708L3.443 8.975A3 3 0 0 1 1.185 10H1a1 1 0 1 0 0 2h.185a5 5 0 0 0 3.763-1.708l4.609-5.267A3 3 0 0 1 11.815 4H12v1.5a.5.5 0 0 0 .82.384l3-2.5a.5.5 0 0 0 0-.768l-3-2.5ZM1 4h.185a3 3 0 0 1 2.258 1.025l.4.457 1.328-1.52-.223-.254A5 5 0 0 0 1.185 2H1a1 1 0 0 0 0 2Z",
											}),
										}),
										e.jsx("span", { children: "Connect" }),
									],
								}),
							],
						}),
					],
				}),
			}),
			e.jsx("div", {
				className:
					"relative h-full bg-slate-800 rounded-3xl p-px before:absolute before:w-80 before:h-80 before:-left-40 before:-top-40 before:bg-slate-400 before:rounded-full before:opacity-0 before:pointer-events-none before:transition-opacity before:duration-500 before:translate-x-[var(--mouse-x)] before:translate-y-[var(--mouse-y)] before:group-hover:opacity-100 before:z-10 before:blur-[100px] after:absolute after:w-96 after:h-96 after:-left-48 after:-top-48 after:bg-indigo-500 after:rounded-full after:opacity-0 after:pointer-events-none after:transition-opacity after:duration-500 after:translate-x-[var(--mouse-x)] after:translate-y-[var(--mouse-y)] after:hover:opacity-10 after:z-30 after:blur-[100px] overflow-hidden",
				children: e.jsxs("div", {
					className:
						"relative h-full bg-slate-900 p-6 pb-8 rounded-[inherit] z-20 overflow-hidden",
					children: [
						e.jsx("div", {
							className:
								"absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 pointer-events-none -z-10 w-1/2 aspect-square",
							"aria-hidden": "true",
							children: e.jsx("div", {
								className:
									"absolute inset-0 translate-z-0 bg-slate-800 rounded-full blur-[80px]",
							}),
						}),
						e.jsxs("div", {
							className: "flex flex-col h-full items-center text-center",
							children: [
								e.jsxs("div", {
									className: "relative inline-flex",
									children: [
										e.jsx("div", {
											className:
												"w-[40%] h-[40%] absolute inset-0 m-auto -translate-y-[10%] blur-3xl -z-10 rounded-full bg-indigo-600",
											"aria-hidden": "true",
										}),
										e.jsx("img", {
											className: "inline-flex",
											src: "/card-02.png",
											width: "200",
											height: "200",
											alt: "Card 02",
										}),
									],
								}),
								e.jsxs("div", {
									className: "grow mb-5",
									children: [
										e.jsx("h2", {
											className: "text-xl text-slate-200 font-bold mb-1",
											children: "Amazing Integration",
										}),
										e.jsx("p", {
											className: "text-sm text-slate-500",
											children:
												"Quickly apply filters to refine your issues lists and create custom views.",
										}),
									],
								}),
								e.jsxs("a", {
									className:
										"inline-flex justify-center items-center whitespace-nowrap rounded-lg bg-slate-800 hover:bg-slate-900 border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 focus-visible:outline-none focus-visible:ring focus-visible:ring-indigo-300 dark:focus-visible:ring-slate-600 transition-colors duration-150",
									href: "#0",
									children: [
										e.jsx("svg", {
											className: "fill-slate-500 mr-2",
											xmlns: "http://www.w3.org/2000/svg",
											width: "16",
											height: "14",
											children: e.jsx("path", {
												d: "M12.82 8.116A.5.5 0 0 0 12 8.5V10h-.185a3 3 0 0 1-2.258-1.025l-.4-.457-1.328 1.519.223.255A5 5 0 0 0 11.815 12H12v1.5a.5.5 0 0 0 .82.384l3-2.5a.5.5 0 0 0 0-.768l-3-2.5ZM12.82.116A.5.5 0 0 0 12 .5V2h-.185a5 5 0 0 0-3.763 1.708L3.443 8.975A3 3 0 0 1 1.185 10H1a1 1 0 1 0 0 2h.185a5 5 0 0 0 3.763-1.708l4.609-5.267A3 3 0 0 1 11.815 4H12v1.5a.5.5 0 0 0 .82.384l3-2.5a.5.5 0 0 0 0-.768l-3-2.5ZM1 4h.185a3 3 0 0 1 2.258 1.025l.4.457 1.328-1.52-.223-.254A5 5 0 0 0 1.185 2H1a1 1 0 0 0 0 2Z",
											}),
										}),
										e.jsx("span", { children: "Connect" }),
									],
								}),
							],
						}),
					],
				}),
			}),
			e.jsx("div", {
				className:
					"relative h-full bg-slate-800 rounded-3xl p-px before:absolute before:w-80 before:h-80 before:-left-40 before:-top-40 before:bg-slate-400 before:rounded-full before:opacity-0 before:pointer-events-none before:transition-opacity before:duration-500 before:translate-x-[var(--mouse-x)] before:translate-y-[var(--mouse-y)] before:group-hover:opacity-100 before:z-10 before:blur-[100px] after:absolute after:w-96 after:h-96 after:-left-48 after:-top-48 after:bg-indigo-500 after:rounded-full after:opacity-0 after:pointer-events-none after:transition-opacity after:duration-500 after:translate-x-[var(--mouse-x)] after:translate-y-[var(--mouse-y)] after:hover:opacity-10 after:z-30 after:blur-[100px] overflow-hidden",
				children: e.jsxs("div", {
					className:
						"relative h-full bg-slate-900 p-6 pb-8 rounded-[inherit] z-20 overflow-hidden",
					children: [
						e.jsx("div", {
							className:
								"absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 pointer-events-none -z-10 w-1/2 aspect-square",
							"aria-hidden": "true",
							children: e.jsx("div", {
								className:
									"absolute inset-0 translate-z-0 bg-slate-800 rounded-full blur-[80px]",
							}),
						}),
						e.jsxs("div", {
							className: "flex flex-col h-full items-center text-center",
							children: [
								e.jsxs("div", {
									className: "relative inline-flex",
									children: [
										e.jsx("div", {
											className:
												"w-[40%] h-[40%] absolute inset-0 m-auto -translate-y-[10%] blur-3xl -z-10 rounded-full bg-indigo-600",
											"aria-hidden": "true",
										}),
										e.jsx("img", {
											className: "inline-flex",
											src: "/card-03.png",
											width: "200",
											height: "200",
											alt: "Card 03",
										}),
									],
								}),
								e.jsxs("div", {
									className: "grow mb-5",
									children: [
										e.jsx("h2", {
											className: "text-xl text-slate-200 font-bold mb-1",
											children: "Amazing Integration",
										}),
										e.jsx("p", {
											className: "text-sm text-slate-500",
											children:
												"Quickly apply filters to refine your issues lists and create custom views.",
										}),
									],
								}),
								e.jsxs("a", {
									className:
										"inline-flex justify-center items-center whitespace-nowrap rounded-lg bg-slate-800 hover:bg-slate-900 border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 focus-visible:outline-none focus-visible:ring focus-visible:ring-indigo-300 dark:focus-visible:ring-slate-600 transition-colors duration-150",
									href: "#0",
									children: [
										e.jsx("svg", {
											className: "fill-slate-500 mr-2",
											xmlns: "http://www.w3.org/2000/svg",
											width: "16",
											height: "14",
											children: e.jsx("path", {
												d: "M12.82 8.116A.5.5 0 0 0 12 8.5V10h-.185a3 3 0 0 1-2.258-1.025l-.4-.457-1.328 1.519.223.255A5 5 0 0 0 11.815 12H12v1.5a.5.5 0 0 0 .82.384l3-2.5a.5.5 0 0 0 0-.768l-3-2.5ZM12.82.116A.5.5 0 0 0 12 .5V2h-.185a5 5 0 0 0-3.763 1.708L3.443 8.975A3 3 0 0 1 1.185 10H1a1 1 0 1 0 0 2h.185a5 5 0 0 0 3.763-1.708l4.609-5.267A3 3 0 0 1 11.815 4H12v1.5a.5.5 0 0 0 .82.384l3-2.5a.5.5 0 0 0 0-.768l-3-2.5ZM1 4h.185a3 3 0 0 1 2.258 1.025l.4.457 1.328-1.52-.223-.254A5 5 0 0 0 1.185 2H1a1 1 0 0 0 0 2Z",
											}),
										}),
										e.jsx("span", { children: "Connect" }),
									],
								}),
							],
						}),
					],
				}),
			}),
		],
	})
);
var E = "vocs_Button_button",
	R = "vocs_Button_button_accent";
function S({ children: t, className: s, href: r, variant: l }) {
	return e.jsx(H, {
		className: a(s, E, l === "accent" && R),
		href: r,
		variant: "styleless",
		children: t,
	});
}
var Z = "vocs_HomePage_button",
	B = "vocs_HomePage_buttons",
	V = "vocs_HomePage_description",
	$ = "vocs_HomePage_logo",
	h = "vocs_HomePage_packageManager",
	D = "vocs_HomePage",
	I = "vocs_HomePage_tabs",
	x = "vocs_HomePage_tabsContent",
	T = "vocs_HomePage_tabsList",
	X = "vocs_HomePage_tagline",
	q = "vocs_HomePage_title";
function m({ children: t, className: s }) {
	return e.jsx("div", { className: a(s, D), children: t });
}
function b({ className: t }) {
	const { logoUrl: s, title: r } = z();
	return s
		? e.jsx("div", { className: a(t, $), children: e.jsx(M, {}) })
		: e.jsx("h1", { className: a(t, q), children: r });
}
function v({ children: t, className: s }) {
	return e.jsx("div", { className: a(s, X), children: t });
}
function p({ children: t, className: s }) {
	return e.jsx("div", { className: a(s, V), children: t });
}
function Q({ children: t, className: s }) {
	return e.jsx("div", { className: a(s, B), children: t });
}
function O(t) {
	return e.jsx(S, { ...t, className: a(Z, t.className) });
}
function W({ name: t, type: s = "install" }) {
	return e.jsxs(A, {
		className: I,
		defaultValue: "npm",
		children: [
			e.jsxs(C, {
				className: T,
				children: [
					e.jsx(f, { value: "npm", children: "npm" }),
					e.jsx(f, { value: "pnpm", children: "pnpm" }),
					e.jsx(f, { value: "yarn", children: "yarn" }),
				],
			}),
			e.jsxs(u, {
				className: x,
				value: "npm",
				children: [
					e.jsx("span", { className: h, children: "npm" }),
					" ",
					s === "init" ? "init" : "install",
					" ",
					t,
				],
			}),
			e.jsxs(u, {
				className: x,
				value: "pnpm",
				children: [
					e.jsx("span", { className: h, children: "pnpm" }),
					" ",
					s === "init" ? "create" : "install",
					" ",
					t,
				],
			}),
			e.jsxs(u, {
				className: x,
				value: "yarn",
				children: [
					e.jsx("span", { className: h, children: "yarn" }),
					" ",
					s === "init" ? "create" : "install",
					" ",
					t,
				],
			}),
		],
	});
}
const Y = Object.freeze(
		Object.defineProperty(
			{
				__proto__: null,
				Button: O,
				Buttons: Q,
				Description: p,
				InstallPackage: W,
				Logo: b,
				Root: m,
				Tagline: v,
			},
			Symbol.toStringTag,
			{ value: "Module" },
		),
	),
	G = { layout: "landing" };
function g(t) {
	return (
		Y || n("HomePage", !1),
		p || n("HomePage.Description", !0),
		b || n("HomePage.Logo", !0),
		m || n("HomePage.Root", !0),
		v || n("HomePage.Tagline", !0),
		e.jsxs(m, {
			children: [
				e.jsx(b, {}),
				e.jsx(v, { children: "Welcome to my personal website" }),
				e.jsxs(p, {
					children: [
						"I'm a software engineer, currently working at ",
						e.jsx("a", {
							className: "text-blue-500",
							href: "https://nexera.id/",
							children: "NexeraID",
						}),
					],
				}),
				e.jsx(k, {}),
			],
		})
	);
}
function J(t = {}) {
	const { wrapper: s } = { ...P(), ...t.components };
	return s ? e.jsx(s, { ...t, children: e.jsx(g, { ...t }) }) : g();
}
function n(t, s) {
	throw new Error(
		"Expected " +
			(s ? "component" : "object") +
			" `" +
			t +
			"` to be defined: you likely forgot to import, pass, or provide it.",
	);
}
export { J as default, G as frontmatter };
