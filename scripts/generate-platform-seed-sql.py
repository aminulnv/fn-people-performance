#!/usr/bin/env python3
"""Generate db/migrations/00006_seed_hr_directory.sql from the HR CSV + team owners."""

from __future__ import annotations

import csv
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "Untitled spreadsheet - Master Database for HR Analytic (1).csv"
OUT_PATH = ROOT / "db" / "migrations" / "00006_seed_hr_directory.sql"

# Organisation → Teams owners (ground truth from Edit teams UI).
TEAM_OWNERS: dict[str, str] = {
    "Accounts": "Md. Tariqul Islam",
    "Admin Operations": "Sheikh Rafiq Ahmed",
    "AI": "Tanzim Hasan Fahim",
    "AI & Automation": "Md. Salman Wahid",
    "Analytics & MarTech": "Afrina Aziz Priti",
    "Backend": "Tanzim Hasan Fahim",
    "Back Office - FundedNext": "Md. Salman Wahid",
    "Brand & Creative": "Afrina Aziz Priti",
    "Business Development": "MD. Selim Mahmud",
    "Business Development - FNmarkets": "MD. Selim Mahmud",
    "Business Intelligence": "Md. Abdullah Al Monaem",
    "Business Intelligence - FNmarkets": "MD. Selim Mahmud",
    "Business Operations": "Md. Abdullah Al Monaem",
    "Business Operations - OPM": "MD. Selim Mahmud",
    "Case Resolution": "Md. Abdullah Al Monaem",
    "Case Resolution - FNmarkets": "MD. Selim Mahmud",
    "CEx Insights & Analytics": "Md. Salman Wahid",
    "Client Support": "Md. Ruhul Amin Siraji",
    "Community Management": "Rifat Ahmed",
    "Compliance": "Syed Abdullah Jayed",
    "Compliance - ACCA": "Sheikh Rafiq Ahmed",
    "Content & Events": "Rifat Ahmed",
    "Content Writer": "Afrina Aziz Priti",
    "Copywriting": "Afrina Aziz Priti",
    "Core": "Syed Abdullah Jayed",
    "CQC": "Md. Salman Wahid",
    "Cyber Security": "Tanzim Hasan Fahim",
    "Data": "Tanzim Hasan Fahim",
    "Dealing Desk": "MD. Selim Mahmud",
    "DevOps": "Tanzim Hasan Fahim",
    "Email": "Md. Salman Wahid",
    "Email Marketing": "Rifat Ahmed",
    "Email Team": "Rifat Ahmed",
    "External Affairs": "Sheikh Rafiq Ahmed",
    "Finance": "Md. Tariqul Islam",
    "Frontend": "Tanzim Hasan Fahim",
    "General Ops": "Sheikh Syed Ahmed",
    "Global Accounting": "Md. Tariqul Islam",
    "Global Accounting - NEXT Lanka": "Md. Tariqul Islam",
    "HRBP": "Elvira Moey Shae'Fee",
    "Internal Audit": "Md. Tariqul Islam",
    "Investigation": "Md. Ruhul Amin Siraji",
    "IT": "Tanzim Hasan Fahim",
    "Legal": "Syed Abdullah Jayed",
    "Live Chat": "Md. Salman Wahid",
    "Media & Performance": "Afrina Aziz Priti",
    "Mobile App": "Tanzim Hasan Fahim",
    "Operations": "MD. Selim Mahmud",
    "Operations - FN": "Md. Salman Wahid",
    "Operations - SL": "Mahamudul Hoque Shovho",
    "Partner Acquisition": "Rifat Ahmed",
    "Partner Acqusition": "Rifat Ahmed",  # CSV typo
    "Partner Management": "Rifat Ahmed",
    "Partner Operation": "Rifat Ahmed",
    "Partner Relationship": "Rifat Ahmed",
    "Payment Ops": "Sheikh Syed Ahmed",
    "Payments Research & Development": "Sheikh Syed Ahmed",
    "Payroll": "Elvira Moey Shae'Fee",
    "People Experience": "Elvira Moey Shae'Fee",
    "Performance & Total Rewards": "Angie Ng Yun Ni",
    "Platform": "MD. Selim Mahmud",
    "Platform Operations": "Md. Ruhul Amin Siraji",
    "PR & Awards": "Rifat Ahmed",
    "Product Design": "Darren Lau",
    "Product Management": "Sheikh Rokya Sumana",
    "Product Management - FNmarkets": "Ruchi Gupta",
    "Project Management Office": "Nazbir Ahmed Nabil",
    "Pro Solution Task Force (PSTF)": "Md. Salman Wahid",
    "PSTF + Email": "Md. Salman Wahid",
    "R&D": "Md. Salman Wahid",
    "Regulatory Reporting": "Md. Tariqul Islam",
    "Reporting & Analysis": "Md. Tariqul Islam",
    "Reputation Management": "Rifat Ahmed",
    "Reputation Operations": "Rifat Ahmed",
    "Revenue Assurance": "Md. Tariqul Islam",
    "Revenue Operations": "Sheikh Syed Ahmed",
    "Revenue Ops": "Sheikh Syed Ahmed",
    "Risk Monitoring & Data": "MD. Selim Mahmud",
    "Risk & Operational": "MD. Selim Mahmud",
    "Sales & Account Management": "MD. Selim Mahmud",
    "SEO": "Afrina Aziz Priti",
    "Social & Community": "Rifat Ahmed",
    "Social Media Management": "Afrina Aziz Priti",
    "Special Project": "Md. Salman Wahid",
    "SQA": "Tanzim Hasan Fahim",
    "Strategic Coordination": "Nazbir Ahmed Nabil",
    "Strategic Execution Lead": "Nazbir Ahmed Nabil",
    "Talent Acquisition": "Elvira Moey Shae'Fee",
    "Technical Support": "Tanzim Hasan Fahim",
    "Treasury Ops": "Sheikh Syed Ahmed",
    "WFM Specialist": "Md. Salman Wahid",
}


def norm(s: str) -> str:
    return " ".join((s or "").strip().lower().split())


def sql_str(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def main() -> None:
    with CSV_PATH.open(newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

    employees: list[dict] = []
    by_name: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        eid = (r.get("Employee ID") or "").strip()
        if not eid:
            continue
        emp = {
            "id": int(eid),
            "name": (r.get("Name") or "").strip(),
            "email": (r.get("Email") or "").strip().lower(),
            "department": (r.get("Department") or "").strip(),
            "team": (r.get("Team") or "").strip(),
            "reports_to": (r.get("Reports to") or "").strip(),
            "department_head": (r.get("Department Head") or "").strip(),
            "job_title": (r.get("Job title") or "").strip(),
            "division": (r.get("Division") or "").strip(),
        }
        if not emp["name"] or not emp["email"]:
            raise SystemExit(f"Missing name/email for employee {eid}")
        employees.append(emp)
        by_name[norm(emp["name"])].append(emp)

    # Ambiguous names break FK resolution by name.
    ambiguous = {k: v for k, v in by_name.items() if len(v) > 1}
    if ambiguous:
        raise SystemExit(f"Duplicate employee names: {list(ambiguous)[:10]}")

    name_to_id = {k: v[0]["id"] for k, v in by_name.items()}

    departments = sorted({e["department"] for e in employees if e["department"]})
    dept_head_votes: dict[str, Counter[str]] = defaultdict(Counter)
    for e in employees:
        if e["department"] and e["department_head"]:
            dept_head_votes[e["department"]][e["department_head"]] += 1

    dept_canonical_head: dict[str, str] = {}
    for d in departments:
        votes = dept_head_votes.get(d)
        if votes:
            dept_canonical_head[d] = votes.most_common(1)[0][0]

    # Teams as (department, team name) pairs from employee rows.
    team_keys: set[tuple[str, str]] = set()
    for e in employees:
        if e["department"] and e["team"]:
            team_keys.add((e["department"], e["team"]))

    missing_owners = sorted(
        {team for _, team in team_keys if team not in TEAM_OWNERS}
    )
    if missing_owners:
        raise SystemExit(f"No owner mapped for teams: {missing_owners}")

    lines: list[str] = []
    lines.append("-- Wipe + seed platform org directory from HR Analytic CSV.")
    lines.append("-- Generated by scripts/generate-platform-seed-sql.py - do not edit by hand.")
    lines.append("BEGIN;")
    lines.append("")
    lines.append("-- Clear FKs then wipe org tables (keep platform.divisions).")
    lines.append(
        "UPDATE platform.departments SET head_employee_id = NULL, hrbp_employee_id = NULL;"
    )
    lines.append("UPDATE platform.teams SET owner_employee_id = NULL;")
    lines.append(
        """UPDATE platform.employees SET
  reports_to_employee_id = NULL,
  department_head_employee_id = NULL,
  team_id = NULL,
  department_id = NULL,
  division_id = NULL;"""
    )
    lines.append("DELETE FROM platform.employees;")
    lines.append("DELETE FROM platform.teams;")
    lines.append("DELETE FROM platform.departments;")
    lines.append("")
    lines.append("-- Departments")
    for d in departments:
        lines.append(
            f"INSERT INTO platform.departments (name) VALUES ({sql_str(d)});"
        )
    lines.append("")
    lines.append("-- Employees (org FKs filled in later passes)")
    for e in sorted(employees, key=lambda x: x["id"]):
        div = e["division"]
        div_sql = (
            f"(SELECT id FROM platform.divisions WHERE lower(name) = lower({sql_str(div)}) LIMIT 1)"
            if div
            else "NULL"
        )
        dept = e["department"]
        dept_sql = (
            f"(SELECT id FROM platform.departments WHERE lower(name) = lower({sql_str(dept)}) LIMIT 1)"
            if dept
            else "NULL"
        )
        lines.append(
            "INSERT INTO platform.employees ("
            "employee_id, email, name, joining_date, status, job_title, job_grade, "
            "department_id, division_id"
            ") VALUES ("
            f"{e['id']}, {sql_str(e['email'])}, {sql_str(e['name'])}, NULL, 'active', "
            f"{sql_str(e['job_title'])}, '', {dept_sql}, {div_sql}"
            ");"
        )
    lines.append("")
    lines.append("-- Teams + owners")
    for dept, team in sorted(team_keys):
        owner_name = TEAM_OWNERS[team]
        owner_id = name_to_id.get(norm(owner_name))
        if owner_id is None:
            raise SystemExit(f"Owner not in CSV: {owner_name!r} (team {team!r})")
        lines.append(
            "INSERT INTO platform.teams (department_id, name, owner_employee_id) VALUES ("
            f"(SELECT id FROM platform.departments WHERE lower(name) = lower({sql_str(dept)}) LIMIT 1), "
            f"{sql_str(team)}, {owner_id}"
            ");"
        )
    lines.append("")
    lines.append("-- Employee team / reports_to / personal department head")
    for e in sorted(employees, key=lambda x: x["id"]):
        sets: list[str] = []
        if e["department"] and e["team"]:
            sets.append(
                "team_id = ("
                "SELECT t.id FROM platform.teams t "
                "JOIN platform.departments d ON d.id = t.department_id "
                f"WHERE lower(d.name) = lower({sql_str(e['department'])}) "
                f"AND lower(t.name) = lower({sql_str(e['team'])}) LIMIT 1)"
            )
        if e["reports_to"]:
            rid = name_to_id.get(norm(e["reports_to"]))
            if rid is None:
                raise SystemExit(
                    f"Reports-to not in CSV: {e['reports_to']!r} (emp {e['id']})"
                )
            if rid != e["id"]:
                sets.append(f"reports_to_employee_id = {rid}")
        if e["department_head"]:
            hid = name_to_id.get(norm(e["department_head"]))
            if hid is None:
                raise SystemExit(
                    f"Department head not in CSV: {e['department_head']!r} (emp {e['id']})"
                )
            sets.append(f"department_head_employee_id = {hid}")
        if not sets:
            continue
        lines.append(
            f"UPDATE platform.employees SET {', '.join(sets)}, updated_at = now() "
            f"WHERE employee_id = {e['id']};"
        )
    lines.append("")
    lines.append("-- Department primary head = most common CSV Department Head (HRBP left null)")
    for d, head_name in sorted(dept_canonical_head.items()):
        hid = name_to_id.get(norm(head_name))
        if hid is None:
            raise SystemExit(f"Dept head not in CSV: {head_name!r} ({d})")
        lines.append(
            "UPDATE platform.departments SET "
            f"head_employee_id = {hid}, hrbp_employee_id = NULL, updated_at = now() "
            f"WHERE lower(name) = lower({sql_str(d)});"
        )
    lines.append("")
    lines.append("COMMIT;")
    lines.append("")

    OUT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_PATH}")
    print(f"  employees={len(employees)} departments={len(departments)} teams={len(team_keys)}")


if __name__ == "__main__":
    main()
