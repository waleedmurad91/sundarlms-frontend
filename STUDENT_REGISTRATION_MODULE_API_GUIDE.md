# Student Registration Module API Guide

This module is separate from previous student registration/signup flows.

## Base URL

`http://localhost:8000/api`

## Core Rules

- `formb_id` is unique.
- `formb_id` is used as student login username (`users.username`).
- `registration_closing_date` is used as validity cutoff (`registration_closing_date >= today` and `is_active = true`).
- Student location fields include: `province`, `district`, `tehsil`, `city`, `cluster_area`.
- If student selects school first, missing location fields auto-fill from school.
- If student manually selects location first, frontend should call schools API with filters; selected school must match provided location.
- Schools list includes synthetic option: `{"id":"__other__","name":"Other"}`.
- If `school_id="__other__"`, `other_school_name` is required.
- If `school_id="__other__"`, system links student to pre-created `"Other"` school of selected city.
- `other_school_name` is stored for informational purpose.
- `open` source:
  - PMC session selection is not allowed.
  - Student can opt in to RMC only if selected school is RMC member and valid RMC session is selected.
- `rmc` source:
  - only RMC schools should be used.
- `pmc` source:
  - grade is required.
  - selected PMC session must be valid for selected grade.
- On registration with `grade_id`, `school_class_id` mapping is auto-created if missing (`school_id + grade_id`, default section `A`).

## Public APIs

## 1) List Schools by Source

`GET /registration-module/schools?source=open|rmc|pmc&province=&district=&tehsil=&city=&cluster_area=`

### Auth

- Public

### Behavior

- `source=rmc`: returns only RMC member schools.
- `source=open|pmc`: returns all approved schools.
- Supports location filters:
  - `province`
  - `district`
  - `tehsil`
  - `city`
  - `cluster_area`

### Success Response (`200`)

```json
{
  "status": true,
  "data": [
    {
      "id": "__other__",
      "name": "Other",
      "display_name": "Other",
      "province": null,
      "district": null,
      "tehsil": null,
      "city": null,
      "cluster_area": null,
      "address": null,
      "rmc_member": false
    },
    {
      "id": 1,
      "name": "ABC School",
      "display_name": "ABC School (Lahore)",
      "province": "Punjab",
      "district": "Lahore",
      "tehsil": "Model Town",
      "city": "Lahore",
      "cluster_area": "Model Town Block A",
      "address": "Street 1",
      "rmc_member": true
    }
  ]
}
```

## 2) List Valid RMC Sessions

`GET /registration-module/rmc-sessions`

### Auth

- Public

### Success Response (`200`)

```json
{
  "status": true,
  "data": [
    {
      "id": 2,
      "title": "RMC 2026",
      "contest_date": "2026-05-15",
      "registration_closing_date": "2026-05-10",
      "is_active": true
    }
  ]
}
```

## 3) List Valid PMC Sessions by Grade

`GET /registration-module/pmc-sessions?grade_id={grade_id}`

### Auth

- Public

### Required Query

- `grade_id`

### Success Response (`200`)

```json
{
  "status": true,
  "data": [
    {
      "id": 3,
      "type": "PMC-5",
      "grade_id": 5,
      "title": "PMC Grade 5",
      "contest_date": "2026-04-30",
      "registration_closing_date": "2026-04-25",
      "is_active": true
    }
  ]
}
```

## 4) Create Student Registration

`POST /registration-module/students`

### Auth

- Public

### Request

```json
{
  "source": "open",
  "name": "Ali Ahmed",
  "email": "ali.ahmed@example.com",
  "password": "Student@123",
  "formb_id": "3520212345671",
  "school_id": 1,
  "other_school_name": null,
  "grade_id": 5,
  "dob": "2014-02-10",
  "gender": "Male",
  "phone": "+923001112233",
  "student_phone": "+923001112233",
  "father_name": "Ahmed Raza",
  "father_cnic": "3520212345671",
  "father_phone": "+923339998877",
  "province": "Punjab",
  "district": "Lahore",
  "tehsil": "Model Town",
  "city": "Lahore",
  "cluster_area": "Model Town Block A",
  "address": "House 10, Street 20",
  "rmc_participation": true,
  "rmc_session_id": 2
}
```

### Field Notes

- `source`: `open|rmc|pmc`.
- `school_id` can be numeric id or `"__other__"`.
- if `school_id="__other__"`, send `other_school_name`.
- if `school_id="__other__"`, `city` is required to resolve that city's existing `"Other"` school.
- `pmc` source requires `grade_id` and `pmc_session_id`.
- `open` / `rmc` cannot send `pmc_session_id`.
- `rmc_participation=true` requires:
  - selected school is RMC member
  - valid `rmc_session_id`
- If `province/district/city/cluster_area` are sent manually, selected `school_id` must belong to same location.
- If location fields are omitted, backend auto-fills from selected school.
- `Other` school is allowed only in `open` source.
- `RMC participation` is not allowed with `Other` school.
- With `Other` school, if `grade_id` is provided, class linkage is auto-created/mapped (`school_id + grade_id`).

### Success Response (`201`)

```json
{
  "status": true,
  "message": "Student registered successfully.",
  "data": {
    "registration": {
      "id": 10,
      "source": "open",
      "formb_id": "3520212345671"
    },
    "student_id": 25,
    "user_id": 40,
    "username": "3520212345671"
  }
}
```

## Admin APIs (`auth:sanctum`, role: `admin`)

## 5) Registration Students CRUD

- `GET /admin/registration-module/students`
- `POST /admin/registration-module/students`
- `GET /admin/registration-module/students/{id}`
- `POST /admin/registration-module/students/{id}`
- `DELETE /admin/registration-module/students/{id}`

`POST /admin/registration-module/students/{id}` updates fields like:

```json
{
  "name": "Ali Ahmed Updated",
  "district": "Kasur",
  "tehsil": "Pattoki",
  "city": "Pattoki",
  "address": "Updated Address",
  "rmc_participation": false,
  "status": 1
}
```

## 6) RMC Participations CRUD

- `GET /admin/registration-module/rmc-participations`
- `POST /admin/registration-module/rmc-participations`
- `GET /admin/registration-module/rmc-participations/{id}`
- `POST /admin/registration-module/rmc-participations/{id}`
- `DELETE /admin/registration-module/rmc-participations/{id}`

### Create Request Example

```json
{
  "registration_module_student_id": 10,
  "student_id": 25,
  "rmc_session_id": 2,
  "is_participating": true
}
```

## 7) PMC Participations CRUD

- `GET /admin/registration-module/pmc-participations`
- `POST /admin/registration-module/pmc-participations`
- `GET /admin/registration-module/pmc-participations/{id}`
- `POST /admin/registration-module/pmc-participations/{id}`
- `DELETE /admin/registration-module/pmc-participations/{id}`

### Create Request Example

```json
{
  "registration_module_student_id": 11,
  "student_id": 26,
  "pmc_session_id": 3,
  "is_participating": true
}
```

## Common Error Responses

## Validation Error (`422`)

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "formb_id": ["The formb id has already been taken."]
  }
}
```

## Unauthorized (`401`) / Forbidden (`403`)

- Admin endpoints require valid Sanctum token and admin role.

## Login After Signup

Student can login immediately using:

- `identifier`: `formb_id`
- `password`: submitted password
